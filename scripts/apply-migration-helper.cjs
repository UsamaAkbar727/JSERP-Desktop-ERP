/**
 * Apply Migration v23 via Electron IPC
 * This script uses the running Electron app to apply the migration
 */

// Create a simple HTML file that can run in the browser to execute migration
const migrationScript = `
<html>
<head>
    <title>Apply Migration v23</title>
</head>
<body>
    <h1>Applying Migration v23</h1>
    <div id="status">Starting migration...</div>
    
    <script>
        async function applyMigration() {
            const statusDiv = document.getElementById('status');
            
            try {
                // Check if window.api exists
                if (!window.api) {
                    statusDiv.innerHTML = '<span style="color: red;">Error: window.api not available. Make sure Electron is running.</span>';
                    return;
                }
                
                statusDiv.innerHTML = 'Checking current database version...';
                
                // Get current version (we'll use a simple query to check if table exists)
                try {
                    const result = await window.api.expenseCategories.list();
                    statusDiv.innerHTML = '<span style="color: green;">✅ Success! expense_categories table already exists with ' + (result.data?.length || 0) + ' categories.</span>';
                    return;
                } catch (error) {
                    statusDiv.innerHTML = 'Table does not exist. Creating expense_categories table...';
                }
                
                // Since we can't directly execute DDL through our API, let's add the default categories
                // after manually creating the table
                statusDiv.innerHTML = '<span style="color: orange;">Please manually create the table using the SQL migration file, then refresh this page.</span>';
                
            } catch (error) {
                statusDiv.innerHTML = '<span style="color: red;">Error: ' + error.message + '</span>';
                console.error('Migration error:', error);
            }
        }
        
        // Run migration when page loads
        window.addEventListener('DOMContentLoaded', applyMigration);
    </script>
</body>
</html>
`;

require('fs').writeFileSync('migration-helper.html', migrationScript, 'utf8');
console.log('Created migration-helper.html');
console.log('Open this file in your running Electron app to check migration status.');