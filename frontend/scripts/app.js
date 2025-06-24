document.addEventListener('DOMContentLoaded', () => {
  // Load items from database
  fetch('/items')
    .then(res => res.json())
    .then(items => {
      const list = document.getElementById('items-list');
      items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.name}: ${item.description}`;
        list.appendChild(li);
      });
    });

  // Add new item
  document.getElementById('item-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('item-name').value;
    const description = document.getElementById('item-desc').value;
    
    fetch('/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, description })
    })
    .then(res => res.json())
    .then(item => {
      const li = document.createElement('li');
      li.textContent = `${item.name}: ${item.description}`;
      document.getElementById('items-list').appendChild(li);
      e.target.reset();
    });
  });

  // Load files from S3
  fetch('/files')
    .then(res => res.json())
    .then(files => {
      const list = document.getElementById('files-list');
      files.forEach(file => {
        const li = document.createElement('li');
        li.textContent = file.Key;
        list.appendChild(li);
      });
    });

  // Upload file to S3
  document.getElementById('upload-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const filename = document.getElementById('filename').value;
    const content = document.getElementById('content').value;
    
    fetch('/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename, content })
    })
    .then(res => res.json())
    .then(file => {
      const li = document.createElement('li');
      li.textContent = file.Key;
      document.getElementById('files-list').appendChild(li);
      e.target.reset();
    });
  });
});