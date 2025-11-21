import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Initiative, TabStatus, ProductType } from '@/types/database';
import { toast } from 'sonner';

export function useInitiatives(status: TabStatus, productFilter: ProductType | 'All', searchTerm: string) {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitiatives();
  }, [status, productFilter, searchTerm]);

  const fetchInitiatives = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('roadmap_fields')
        .select('*');

      // Only filter by status if not 'All'
      if (status !== 'All') {
        query = query.eq('Status', status);
      }

      if (productFilter !== 'All') {
        query = query.eq('Product', productFilter);
      }

      if (searchTerm) {
        query = query.or(`Initiative.ilike.%${searchTerm}%,Objective.ilike.%${searchTerm}%,Notes.ilike.%${searchTerm}%,requested_by.ilike.%${searchTerm}%,engineer_assigned.ilike.%${searchTerm}%,dependencies.ilike.%${searchTerm}%,tags_labels.ilike.%${searchTerm}%,epic_theme.ilike.%${searchTerm}%,customer_impact.ilike.%${searchTerm}%,team.ilike.%${searchTerm}%`);
      }

      // Order by Status first when showing 'All', then sort_order, then ID
      if (status === 'All') {
        query = query.order('Status', { ascending: true })
                     .order('sort_order', { ascending: true, nullsFirst: false })
                     .order('ID', { ascending: true });
      } else {
        query = query.order('sort_order', { ascending: true, nullsFirst: false })
                     .order('ID', { ascending: true });
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter out completed initiatives for priority ranking
      const nonCompletedInitiatives = (data || []).filter(init => init.Status !== 'Completed');
      const completedInitiatives = (data || []).filter(init => init.Status === 'Completed');
      
      // Initialize priority_rank only for non-completed initiatives (auto-number based on sort_order)
      const initiativesWithRank = (data || []).map((initiative) => {
        // If completed, ensure priority_rank is null
        if (initiative.Status === 'Completed') {
          return {
            ...initiative,
            priority_rank: null
          };
        }
        
        // For non-completed, find index in non-completed list
        const nonCompletedIndex = nonCompletedInitiatives.findIndex(init => init.ID === initiative.ID);
        return {
          ...initiative,
          priority_rank: initiative.priority_rank ?? (nonCompletedIndex >= 0 ? nonCompletedIndex + 1 : null)
        };
      });
      
      // Batch update: clear priority_rank for completed, set for non-completed with null
      const updatesNeeded: Array<{ ID: number; priority_rank: number | null }> = [];
      
      // Clear priority_rank for completed initiatives that have one
      completedInitiatives.forEach(initiative => {
        if (initiative.priority_rank !== null && initiative.priority_rank !== undefined) {
          updatesNeeded.push({ ID: initiative.ID, priority_rank: null });
        }
      });
      
      // Set priority_rank for non-completed initiatives that don't have one
      nonCompletedInitiatives.forEach((initiative, index) => {
        if (initiative.priority_rank === null || initiative.priority_rank === undefined) {
          updatesNeeded.push({ ID: initiative.ID, priority_rank: index + 1 });
        }
      });
      
      if (updatesNeeded.length > 0) {
        // Update all in parallel
        Promise.all(
          updatesNeeded.map(update =>
            supabase
              .from('roadmap_fields')
              .update({ priority_rank: update.priority_rank })
              .eq('ID', update.ID)
          )
        ).then(() => {
          // Refetch once after all updates
          fetchInitiatives();
        });
      }
      
      setInitiatives(initiativesWithRank);
    } catch (error) {
      console.error('Error fetching initiatives:', error);
      toast.error('Failed to fetch initiatives');
    } finally {
      setLoading(false);
    }
  };

  const createInitiative = async (initiative: Partial<Initiative>) => {
    try {
      // Get the maximum ID to generate the next one
      const { data: maxIdData, error: maxIdError } = await supabase
        .from('roadmap_fields')
        .select('ID')
        .order('ID', { ascending: false })
        .limit(1);

      if (maxIdError) {
        console.error('Error fetching max ID:', maxIdError);
      }

      // Calculate next ID: if we have data, use max + 1, otherwise start at 1
      const nextId = maxIdData && maxIdData.length > 0 && maxIdData[0]?.ID 
        ? maxIdData[0].ID + 1 
        : 1;

      // Determine the status for the new initiative
      const initiativeStatus = initiative.Status || 'Active';

      // Get the maximum priority_rank for non-completed initiatives with the same status
      // This ensures new initiatives are placed at the end of the priority sequence
      let nextPriorityRank = 1;
      if (initiativeStatus !== 'Completed') {
        const { data: maxPriorityData, error: maxPriorityError } = await supabase
          .from('roadmap_fields')
          .select('priority_rank')
          .eq('Status', initiativeStatus)
          .not('priority_rank', 'is', null)
          .order('priority_rank', { ascending: false })
          .limit(1);

        if (maxPriorityError) {
          console.error('Error fetching max priority rank:', maxPriorityError);
        }

        if (maxPriorityData && maxPriorityData.length > 0 && maxPriorityData[0]?.priority_rank) {
          nextPriorityRank = maxPriorityData[0].priority_rank + 1;
        }
      }

      // Prepare insert data with proper defaults
      const insertData: any = {
        ID: nextId,
        Product: initiative.Product || 'Order Management',
        Status: initiativeStatus,
        Priority: initiative.Priority || 'Build Now',
        "Quarter Due": initiative["Quarter Due"] || 'Q1 2026',
        Initiative: initiative.Initiative || 'New Initiative',
        sort_order: initiative.sort_order ?? 0,
        priority_rank: initiativeStatus !== 'Completed' ? nextPriorityRank : null
      };

      // Merge in other initiative fields, but filter out undefined values
      Object.keys(initiative).forEach(key => {
        if (initiative[key as keyof Initiative] !== undefined && key !== 'ID') {
          insertData[key] = initiative[key as keyof Initiative];
        }
      });

      // Remove any undefined values to avoid issues
      Object.keys(insertData).forEach(key => {
        if (insertData[key] === undefined) {
          delete insertData[key];
        }
      });

      const { data, error } = await supabase
        .from('roadmap_fields')
        .insert(insertData)
        .select('*')
        .single();

      if (error) {
        console.error('Supabase error creating initiative:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      toast.success('Initiative created');
      await fetchInitiatives();
      return data;
    } catch (error: any) {
      console.error('Error creating initiative:', error);
      const errorMessage = error?.message || 'Failed to create initiative';
      toast.error(`Failed to create initiative: ${errorMessage}`);
      return null;
    }
  };

  const updateInitiative = async (id: number, updates: Partial<Initiative>) => {
    try {
      // Clean up updates: convert empty strings to null
      const cleanedUpdates: Partial<Initiative> = {};
      Object.keys(updates).forEach(key => {
        const value = updates[key as keyof Initiative];
        // Convert empty strings to null for database
        cleanedUpdates[key as keyof Initiative] = (value === '' || value === undefined) ? null : value;
      });

      // If status is being changed to 'Completed', clear priority_rank
      if (cleanedUpdates.Status === 'Completed') {
        cleanedUpdates.priority_rank = null;
      }
      
      // Log the update for debugging
      console.log('Updating initiative:', { id, updates: cleanedUpdates });
      console.log('Update keys:', Object.keys(cleanedUpdates));
      console.log('Update values:', Object.entries(cleanedUpdates));
      
      // Store the previous state in case we need to revert
      let previousInitiative: Initiative | undefined;
      setInitiatives(prevInitiatives => {
        previousInitiative = prevInitiatives.find(init => init.ID === id);
        return prevInitiatives.map(init => 
          init.ID === id ? { ...init, ...cleanedUpdates } : init
        );
      });

      // Update database - await the result to properly handle errors
      try {
        console.log('Sending to Supabase:', { table: 'roadmap_fields', id, updates: cleanedUpdates });
        const { data, error } = await supabase
          .from('roadmap_fields')
          .update(cleanedUpdates)
          .eq('ID', id)
          .select();
        
        console.log('Supabase response:', { data, error });

        if (error) {
          console.error('Error updating initiative in database:', error);
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            id,
            updates: cleanedUpdates,
            updateKeys: Object.keys(cleanedUpdates),
            updateEntries: Object.entries(cleanedUpdates)
          });
          
          // Revert optimistic update on error
          if (previousInitiative) {
            setInitiatives(prevInitiatives => 
              prevInitiatives.map(init => 
                init.ID === id ? previousInitiative! : init
              )
            );
          }
          
          toast.error(`Failed to save changes: ${error.message}`);
          // Refetch on error to restore correct state
          await fetchInitiatives();
          return false;
        } else {
          console.log('Successfully updated initiative in database:', id);
          return true;
        }
      } catch (error) {
        console.error('Unexpected error updating initiative:', error);
        
        // Revert optimistic update on error
        if (previousInitiative) {
          setInitiatives(prevInitiatives => 
            prevInitiatives.map(init => 
              init.ID === id ? previousInitiative! : init
            )
          );
        }
        
        toast.error('Failed to save changes');
        // Refetch on error to restore correct state
        await fetchInitiatives();
        return false;
      }
    } catch (error) {
      console.error('Error updating initiative:', error);
      toast.error('Failed to update initiative');
      // Refetch on error to restore correct state
      await fetchInitiatives();
      return false;
    }
  };

  const deleteInitiative = async (id: number) => {
    try {
      const { error } = await supabase
        .from('roadmap_fields')
        .delete()
        .eq('ID', id);

      if (error) throw error;
      toast.success('Initiative deleted');
      await fetchInitiatives();
      return true;
    } catch (error) {
      console.error('Error deleting initiative:', error);
      toast.error('Failed to delete initiative');
      return false;
    }
  };

  const updateInitiativeOrder = async (updatedInitiatives: Initiative[]) => {
    try {
      // Filter out completed initiatives for priority ranking
      const nonCompletedInitiatives = updatedInitiatives.filter(init => init.Status !== 'Completed');
      
      // Calculate new priority ranks and sort orders
      const updates = updatedInitiatives.map((initiative, index) => {
        const isCompleted = initiative.Status === 'Completed';
        const nonCompletedIndex = nonCompletedInitiatives.findIndex(init => init.ID === initiative.ID);
        
        return {
          ID: initiative.ID,
          sort_order: index,
          priority_rank: isCompleted ? null : (nonCompletedIndex >= 0 ? nonCompletedIndex + 1 : null)
        };
      });

      // Optimistically update local state immediately (no reload)
      const updatedWithNewRanks = updatedInitiatives.map((initiative) => {
        const update = updates.find(u => u.ID === initiative.ID);
        if (update) {
          return {
            ...initiative,
            sort_order: update.sort_order,
            priority_rank: update.priority_rank
          };
        }
        return initiative;
      });
      setInitiatives(updatedWithNewRanks);

      // Update database in the background (don't await, fire and forget)
      Promise.all(
        updates.map(update =>
          supabase
            .from('roadmap_fields')
            .update({ 
              sort_order: update.sort_order,
              priority_rank: update.priority_rank
            })
            .eq('ID', update.ID)
        )
      ).catch((error) => {
        console.error('Error updating order in database:', error);
        toast.error('Failed to save order changes');
        // Refetch on error to restore correct state
        fetchInitiatives();
      });

      return true;
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
      // Refetch on error to restore correct state
      fetchInitiatives();
      return false;
    }
  };

  return {
    initiatives,
    loading,
    refetch: fetchInitiatives,
    createInitiative,
    updateInitiative,
    deleteInitiative,
    updateInitiativeOrder
  };
}
