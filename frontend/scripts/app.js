// Configuration
const API_BASE_URL = 'http://44.208.28.4:3000'; // Use current EC2 IP address

// Helper function for API calls
async function makeApiCall(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors'
    };

    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Load items from database
  const loadItems = async () => {
    try {
      const items = await makeApiCall('/items');
      const list = document.getElementById('items-list');
      list.innerHTML = ''; // Clear existing items
      
      items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.name || 'No name'}: ${item.description || 'No description'}`;
        list.appendChild(li);
      });
    } catch (error) {
      console.error('Failed to load items:', error);
      alert('Failed to load items. Please try again later.');
    }
  };

  // Add new item
  document.getElementById('item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      const name = document.getElementById('item-name').value.trim();
      const description = document.getElementById('item-desc').value.trim();

      if (!name) {
        alert('Name is required');
        return;
      }

      const newItem = await makeApiCall('/items', 'POST', { name, description });
      
      // Add to UI
      const li = document.createElement('li');
      li.textContent = `${newItem.name}: ${newItem.description}`;
      document.getElementById('items-list').appendChild(li);
      
      // Reset form
      e.target.reset();
    } catch (error) {
      console.error('Failed to save item:', error);
      alert('Failed to save item: ' + error.message);
    }
  });

  // Load files from S3 (via backend)
  const loadFiles = async () => {
    try {
      const files = await makeApiCall('/files');
      const list = document.getElementById('files-list');
      list.innerHTML = '';
      
      files.forEach(file => {
        const li = document.createElement('li');
        li.textContent = file.Key || file.name;
        list.appendChild(li);
      });
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  // Upload file to S3 (via backend)
  document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      const filename = document.getElementById('filename').value.trim();
      const content = document.getElementById('content').value.trim();

      if (!filename) {
        alert('Filename is required');
        return;
      }

      await makeApiCall('/upload', 'POST', { filename, content });
      
      // Refresh files list
      await loadFiles();
      e.target.reset();
      alert('File uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    }
  });

  // Initial loads
  loadItems();
  loadFiles();
});