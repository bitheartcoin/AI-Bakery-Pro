// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "npm:@supabase/functions-js";

serve(async (req) => {
  try {
    // Get the Supabase client from the request
    const supabaseClient = req.supabaseClient;
    
    // Query the information_schema.tables to get all tables in the public schema
    const { data, error } = await supabaseClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      throw error;
    }
    
    // Extract table names
    const tableNames = data.map(table => table.table_name);
    
    return new Response(
      JSON.stringify(tableNames),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  } catch (error) {
    console.error('Error getting tables:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
});