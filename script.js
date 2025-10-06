let shopifyData = [];
let netsuiteData = [];
let shh = document.getElementById("shh");
let nss = document.getElementById("nss");

const auditTrigger = document.getElementById('auditTrigger');
const audit = document.getElementById('audit');
const extractor = document.getElementById('extractor');
const lenext = document.getElementById('lenext');


const shopifyInput = document.getElementById("shopifyFileInput");
const netsuiteInput = document.getElementById("netsuiteFileInput");
const compareBtn = document.getElementById("compareBtn");
const auditTableBody = document.querySelector("#auditTable tbody");
const missingOrdersText = document.getElementById("missingOrdersText");

document.getElementById('link').addEventListener('change', function () {
    alert("Nothing");
})







extractor.addEventListener('click', function (params) {
    let classlist = new Set(lenext.classList);
    if (classlist.has("d-none")) {
        lenext.classList.remove('d-none')
        audit.classList.add("d-none");

    }

})

auditTrigger.addEventListener('click', function () {
    let classlist = new Set(audit.classList);
    if (classlist.has("d-none")) {
        audit.classList.remove('d-none')
        lenext.classList.add('d-none')
    }
})


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

        shh.innerHTML = turnArrayIntoLinefeed(shopifyOrders);
        nss.innerHTML = turnArrayIntoLinefeed(netsuiteOrders);



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
    let out = "";
    for (let i = 0; i < array.length; i++) {
        const element = array[i];
        out = out + element + "\n"

    }
    return out;
}



//--------------------------- String Length and JSON data Extractor------------------
let isJsonMode = false;

// Toggle button
const toggleButton = document.createElement("button");
toggleButton.textContent = "Switch to JSON Mode";
toggleButton.style.marginLeft = "10px";
toggleButton.onclick = () => {
    isJsonMode = !isJsonMode;
    toggleButton.textContent = isJsonMode ? "Switch to String Mode" : "Switch to JSON Mode";
    document.getElementById('lengthInput').placeholder = isJsonMode
        ? "Enter path and length (e.g. payload.Orders.AmazonOrderId:17)"
        : "Enter the exact string length";
    document.getElementById('resultOutput').textContent = '';
};
document.querySelector("#jsonToggle").appendChild(toggleButton);

function extractStrings() {
    const text = document.getElementById('textInput').value;
    const inputValue = document.getElementById('lengthInput').value.trim();
    const output = document.getElementById('resultOutput');

    if (isJsonMode) {
        if (!inputValue.includes(':')) {
            output.textContent = 'Please enter in format: path:length (e.g. payload.Orders.AmazonOrderId:17)';
            return;
        }

        const [pathStr, lengthStr] = inputValue.split(':');
        const pathParts = pathStr.split('.');
        const targetLength = parseInt(lengthStr, 10);

        if (isNaN(targetLength) || targetLength <= 0) {
            output.textContent = 'Invalid length value. Use something like Orders.AmazonOrderId:17';
            return;
        }

        let parsedPayloads = [];

        try {
            // Split and parse multiple JSON objects from textarea
            const rawBlocks = text.trim().split(/(?<=})\s*(?={)/); // splits between } {
            rawBlocks.forEach(block => {
                const parsed = JSON.parse(block);
                parsedPayloads.push(parsed);
            });
        } catch (e) {
            output.textContent = 'Invalid JSON input. Ensure each object is well-formed.';
            return;
        }

        const results = [];

        // Recursive extractor
        function extractPath(obj, path) {
            if (!obj || typeof obj !== 'object') return [];
            const [head, ...tail] = path;
            if (Array.isArray(obj)) {
                return obj.flatMap(item => extractPath(item, path));
            } else if (head in obj) {
                const next = obj[head];
                if (tail.length === 0) {
                    return [next];
                }
                return extractPath(next, tail);
            }
            return [];
        }

        // Process each top-level payload
        parsedPayloads.forEach(payload => {
            const extractedValues = extractPath(payload, pathParts);
            extractedValues.forEach(val => {
                if (typeof val === 'string' && val.length === targetLength) {
                    results.push(val);
                }
            });
        });

        if (results.length > 0) {
            const numberedOutput = results.map((val, i) => `${i + 1}. ${val}`).join('\n');
            output.textContent = numberedOutput;
            copyToClipboard(results.join('\n'), results.length);
        } else {
            output.textContent = `No string values of length ${targetLength} found at "${pathStr}".`;
        }

    } else {
        const length = parseInt(inputValue, 10);
        if (!length || length <= 0) {
            output.textContent = 'Please enter a valid positive number for length.';
            return;
        }

        const words = text.split(/\s+|[.,;!?()\[\]{}"'`]+/).filter(Boolean);
        const matched = words.filter(word => word.length === length);

        if (matched.length > 0) {
            const numberedOutput = matched.map((word, index) => `${index + 1}. ${word}`).join('\n');
            output.textContent = numberedOutput;
            const rawOutput = matched.join('\n');
            copyToClipboard(rawOutput, matched.length);
        } else {
            output.textContent = 'No words found with the specified length.';
        }
    }
}

function copyToClipboard(text, count) {
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = text;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextarea);

    showToast(`${count} item${count !== 1 ? 's' : ''} copied to clipboard`);
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'show';
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
}