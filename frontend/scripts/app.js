document.addEventListener('DOMContentLoaded', () => {
  // Load items from database
  fetch('http://18.212.71.212:3000/items')
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

  console.log(name, description);
  
  // PERBAIKAN 1: Gunakan full URL
  fetch('http://18.212.71.212:3000/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      name: name, 
      description: description 
    })
  })
  .then(res => {
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  })
  .then(item => {
    const li = document.createElement('li');
    // PERBAIKAN 2: Tambahkan validasi
    li.textContent = `${item.name || 'No name'}: ${item.description || 'No description'}`;
    document.getElementById('items-list').appendChild(li);
    e.target.reset();
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Gagal menyimpan item: ' + error.message);
  });
});

  // Load files from S3
  fetch('http://18.212.71.212:3000/items')
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
    
    fetch('/http://44.208.28.4:3000/upload', {
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