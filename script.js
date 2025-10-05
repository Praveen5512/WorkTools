let shopifyData = [];
let netsuiteData = [];
let shh= document.getElementById("shh");
let nss= document.getElementById("nss");

const shopifyInput = document.getElementById("shopifyFileInput");
const netsuiteInput = document.getElementById("netsuiteFileInput");
const compareBtn = document.getElementById("compareBtn");
const auditTableBody = document.querySelector("#auditTable tbody");
const missingOrdersText = document.getElementById("missingOrdersText");

// ------------------- Parse CSV -------------------
function parseCSV(file, callback, isShopify = false) {
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const data = results.data.map(row =>
                Object.fromEntries(
                    Object.entries(row).map(([k, v]) => [k, v === "" ? null : v])
                )
            );

            // Detect date/day column dynamically
            const dateHeader = Object.keys(data[0] || {}).find(h => h.toLowerCase().includes("date") || h.toLowerCase().includes("day"));
            if (!dateHeader) {
                alert(`No date/day column found in ${file.name}`);
                return;
            }

            // Shopify: filter Orders === 1
            let filteredData = data;
            if (isShopify) {
                filteredData = data.filter(row => Number(row["Orders"]) === 1);
            }

            // Group by date
            const grouped = filteredData.reduce((acc, row) => {
                const date = row[dateHeader];
                if (!date) return acc;
                acc[date] = acc[date] || [];
                acc[date].push(row);
                return acc;
            }, {});

            callback(grouped);
        }
    });
}

// ------------------- File Inputs -------------------
shopifyInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        parseCSV(file, (grouped) => shopifyData = grouped, true);
    }
});

netsuiteInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        parseCSV(file, (grouped) => netsuiteData = grouped, false);
    }
});

// ------------------- Compare & Render -------------------
compareBtn.addEventListener("click", () => {
    auditTableBody.innerHTML = "";
    missingOrdersText.value = "";

    const allDates = new Set([...Object.keys(shopifyData), ...Object.keys(netsuiteData)]);

    allDates.forEach(date => {
        const shopifyOrders = (shopifyData[date] || []).map(r => r["shopifyOrderId"]);
        const netsuiteOrders = (netsuiteData[date] || []).map(r => r["shopifyOrderId"]);

        const missingOrders = shopifyOrders.filter(id => !netsuiteOrders.includes(id));
        console.log(shopifyOrders);
        
       shh.innerHTML=turnArrayIntoLinefeed(shopifyOrders);
       nss.innerHTML=turnArrayIntoLinefeed(netsuiteOrders);
       
        

        // Create table row
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";

        tr.innerHTML = `
            <td>${date}</td>
            <td>${shopifyOrders.length}</td>
            <td>${netsuiteOrders.length}</td>
            <td>${missingOrders.length}</td>
        `;

        // Click to show missing orders in textarea
        tr.addEventListener("click", () => {
            missingOrdersText.value = missingOrders.join("\n");
        });

        auditTableBody.appendChild(tr);
    });
});


function turnArrayIntoLinefeed(array) {
    let out="";
    for (let i = 0; i < array.length; i++) {
        const element = array[i];
        out=out+element+"\n"
        
    }
    return out;
}
