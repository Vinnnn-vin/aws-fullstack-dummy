document.addEventListener("DOMContentLoaded", () => {
  const itemsTableBody = document.getElementById("items-list");
  const itemForm = document.getElementById("item-form");

  // Function to render items in the table
  function renderItems(items) {
    itemsTableBody.innerHTML = "";
    items.forEach((item) => {
      const row = document.createElement("tr");

      // Name cell
      const nameCell = document.createElement("td");
      nameCell.textContent = item.name || "No name";
      row.appendChild(nameCell);

      // Description cell
      const descCell = document.createElement("td");
      descCell.textContent = item.description || "No description";
      row.appendChild(descCell);

      // Actions cell
      const actionsCell = document.createElement("td");

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "delete-btn";
      deleteBtn.addEventListener("click", () => deleteItem(item.id));

      actionsCell.appendChild(deleteBtn);
      row.appendChild(actionsCell);

      // Set data-id attribute for reference
      row.setAttribute("data-id", item.id);

      itemsTableBody.appendChild(row);
    });
  }

  // Function to fetch all items
  function fetchItems() {
    fetch("http://3.83.52.143:3000/items")
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then(renderItems)
      .catch((error) => {
        console.error("Error fetching items:", error);
        alert("Failed to load items: " + error.message);
      });
  }

  // Function to add new item
  function addItem(name, description) {
    fetch("http://3.83.52.143:3000/items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name,
        description: description,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(() => {
        fetchItems(); // Refresh the table
        itemForm.reset();
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Failed to save item: " + error.message);
      });
  }

  // Function to delete item
    function deleteItem(itemId) {
    if (!confirm("Are you sure you want to delete this item?")) return;

    fetch(`http://3.83.52.143:3000/items/${itemId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.error || "Failed to delete");
          });
        }
        return res.json();
      })
      .then(() => {
        // Hapus baris dari tabel tanpa perlu refresh seluruh halaman
        const row = document.querySelector(`tr[data-id="${itemId}"]`);
        if (row) row.remove();
      })
      .catch((error) => {
        console.error("Delete error:", error);
        alert("Delete failed: " + error.message);
      });
  }

  // Form submission handler
  itemForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("item-name").value.trim();
    const description = document.getElementById("item-desc").value.trim();

    if (!name) {
      alert("Item name is required");
      return;
    }

    addItem(name, description);
  });

  // Initial load of items
  fetchItems();
});
