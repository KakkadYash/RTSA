(function () {
  function sortList() {
    const list = document.getElementById("id01");
    let switching = true;
    while (switching) {
      switching = false;
      const items = list.getElementsByTagName("p1");
      for (let i = 0; i < items.length - 1; i++) {
        if (items[i].innerHTML.toLowerCase() > items[i + 1].innerHTML.toLowerCase()) {
          items[i].parentNode.insertBefore(items[i + 1], items[i]);
          switching = true;
          break;
        }
      }
    }
  }

  function myFunction() {
    document.getElementById("myDropdown").classList.toggle("show");
  }

  function filterFunction() {
    const input = document.getElementById("myInput");
    const filter = input.value.toUpperCase();
    const div = document.getElementById("myDropdown");
    const a = div.getElementsByTagName("a");
    for (let i = 0; i < a.length; i++) {
      const txtValue = a[i].textContent || a[i].innerText;
      a[i].style.display = txtValue.toUpperCase().includes(filter) ? "" : "none";
    }
  }

  const userId = localStorage.getItem("user_id");

  const loadHistory = async () => {
    try {
      const response = await fetch(`https://uploaded-data-443715.uc.r.appspot.com/history?userId=${userId}`);
      const historyData = await response.json();

      const tableBody = document.getElementById('history-table-body');
      tableBody.innerHTML = '';

      if (!Array.isArray(historyData.history)) {
        console.error("Error: historyData is not an array", historyData);
        return;
      }

      historyData.history.forEach((item, index) => {
        if (index % 3 === 0) {
          const newRow = document.createElement('div');
          newRow.className = 'drill-row';
          tableBody.appendChild(newRow);
        }

        const currentRow = tableBody.lastElementChild;

        const drillDiv = document.createElement('div');
        drillDiv.className = 'drill';
        drillDiv.innerHTML = `
          <video width="320" height="240" controls>
            <source src="${item.video_url}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
          <div class="description">
            <span>${item.video_name}</span>
            <span>${new Date(item.upload_date).toLocaleDateString()}</span>
            <span>${item.top_speed || 'N/A'} km/h</span>
          </div>
        `;

        currentRow.appendChild(drillDiv);
      });
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  // Trigger it directly since we no longer use a separate History tab
  loadHistory();

  // Optional: expose sortList, myFunction, filterFunction if triggered by UI
  window.sortList = sortList;
  window.myFunction = myFunction;
  window.filterFunction = filterFunction;
})();
