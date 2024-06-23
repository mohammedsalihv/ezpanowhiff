
     
let fromDate = document.querySelector('#from-date');
let toDate = document.querySelector('#to-date');


function findReportType() {
    const reportType = document.querySelector('#report-type');
  
        return reportType.value
    

}





const filterButton = document.querySelector('.btn-apply');
filterButton.addEventListener('click', async (event) => {

    if((fromDate.value && !toDate.value) || (!fromDate.value && toDate.value)) return failureMessage('error no date.');
    const reportType = findReportType();
    if((!fromDate.value || !toDate.value) && reportType === 'Filter By' ) return failureMessage('No Date selected, or change filter Type');
    
    // Construct the URL with query parameters
    const url = `/admin/costum-sales-report/${reportType}?fromDate=${fromDate.value}&toDate=${toDate.value}`;

    const response = await fetch(url);
    const body = await response.json();
    if(body.error){
        failureMessage(body.error);
    }else {

        document.querySelector('.noOfOrders').innerHTML = body.data.noOfOrders;
        document.querySelector('.revenueAmount').innerHTML = body.data.revenueAmount;
        document.querySelector('.noOfUsers').innerHTML = body.data.noOfUsers;
        const productsDiv = document.querySelector('.top-products-sale');
        topProductsSale(body.data.productsSale, productsDiv);
        const categoryDiv = document.querySelector('.top-categories-sale');
        topCategoriesSale(body.data.topCategoryies, categoryDiv);
        const paymentMethodsDiv = document.querySelector('.payment-options');
        topPaymentOptions(body.data.paymentOptions, paymentMethodsDiv);
        const orderStatusDiv = document.querySelector('.order-status');
        displayOrderStatusSummary(body.data.orderStatus, orderStatusDiv);
    }
});



const generateReportButton = document.querySelector('#generate-pdf');
generateReportButton.addEventListener('click', async (event) => {
    const reportType = findReportType();
    if(reportType === 'custom' && (!fromDate.value || !toDate.value )) return failureMessage('select date if or change custom');

    const response = await fetch(`/admin/sales/pdf/${reportType}?fromDate=${fromDate.value}&toDate=${toDate.value}`);

    if (response.ok) {
        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report${Date.now()}.pdf`;
        document.body.appendChild(a);

        a.click();

        document.body.removeChild(a);
    } else {
        console.error('Failed to generate PDF:', response.status, response.statusText);
    }
});



const generateExcelButton = document.querySelector('#generate-excel');
generateExcelButton.addEventListener('click', async (event) => {
    const reportType = findReportType();
    if(reportType === 'custom' && (!fromDate.value || !toDate.value )) return failureMessage('select date if or change custom');

    const response = await fetch(`/admin/sales/excel/${reportType}?fromDate=${fromDate.value}&toDate=${toDate.value}`);

    if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report-${reportType}-${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else {
      console.error('Failed to generate Excel:', response.status, response.statusText);
    }
});




document.addEventListener('DOMContentLoaded', async (event) => {
    const response = await fetch('/admin/sales-report-total');
    const body = await response.json();
    document.querySelector('.noOfOrders').innerHTML = body.data.noOfOrders;
    document.querySelector('.revenueAmount').innerHTML = body.data.revenueAmount;
    document.querySelector('.noOfUsers').innerHTML = body.data.noOfUsers;
    const productsDiv = document.querySelector('.top-products-sale');
    topProductsSale(body.data.productsSale, productsDiv);
    const categoryDiv = document.querySelector('.top-categories-sale');
    topCategoriesSale(body.data.topCategoryies, categoryDiv);
    const paymentMethodsDiv = document.querySelector('.payment-options');
    topPaymentOptions(body.data.paymentOptions, paymentMethodsDiv);
    const orderStatusDiv = document.querySelector('.order-status');
    displayOrderStatusSummary(body.data.orderStatus, orderStatusDiv);
});


function topProductsSale(products, productsDiv) {

    productsDiv.innerHTML = `<h3> Top Product Sale <h3>`;

    const productsContainerDiv = document.createElement('div'); // Create a container div to hold all product divs
    productsContainerDiv.classList.add('products-container');

    for (let i = 0; i < products.length; i++) {// Loop through each product
        let productDiv = document.createElement('div'); // Create a div for each product
        productDiv.classList.add('product-item');

        let pName = document.createElement('p'); // Create paragraph elements for product name and count
        pName.innerHTML = products[i].productName;
        let pCount = document.createElement('p');
        pCount.innerHTML = products[i].count;

        productDiv.appendChild(pName); // Append paragraph elements to the product div
        productDiv.appendChild(pCount);

        productsContainerDiv.appendChild(productDiv); // Append the product div to the container div
    }

    productsDiv.appendChild(productsContainerDiv); // Append the container div to the specified productsDiv
}


function topCategoriesSale(categories, categoryDiv) {

    categoryDiv.innerHTML = `<h3> Top Category Sale <h3>`;

    const categoryContainerDiv = document.createElement('div'); // Create a container div to hold all category divs
    categoryContainerDiv.classList.add('category-container');

    for (let i = 0; i < categories.length; i++) {// Loop through each category
        let categoryItemDiv = document.createElement('div'); // Create a div for each category
        categoryItemDiv.classList.add('category-item');

        let categoryName = document.createElement('p'); // Create paragraph elements for category name and count
        categoryName.classList.add('category-name');
        categoryName.innerHTML = categories[i].categoryName;
        let categoryCount = document.createElement('p');
        categoryCount.innerHTML = categories[i].count;
        categoryCount.classList.add('category-count');

        categoryItemDiv.appendChild(categoryName); // Append paragraph elements to the category div
        categoryItemDiv.appendChild(categoryCount);

        categoryContainerDiv.appendChild(categoryItemDiv); // Append the category div to the container div
    }

    // Check if categoryDiv exists before appending the container div
    if (categoryDiv) {
        categoryDiv.appendChild(categoryContainerDiv); // Append the container div to the specified categoryDiv
    }
}


function topPaymentOptions(paymentMethods, paymentMethodsDiv ){

    paymentMethodsDiv.innerHTML = `<h3> Top Payment Options <h3>`;

    const paymentContainerDiv = document.createElement('div'); // Create a container div to hold all payment method divs
    paymentContainerDiv.classList.add('payment-container');

    for( let i = 0; i < paymentMethods.length; i++ ) {
        let paymentItemDiv = document.createElement('div'); // Create a div for each payment method
        paymentItemDiv.classList.add('payment-item');

        let paymentMethodName = document.createElement('p'); // Create paragraph elements for payment method name and count
        paymentMethodName.innerHTML = paymentMethods[i]._id;
        let paymentMethodCount = document.createElement('p');
        paymentMethodCount.innerHTML = paymentMethods[i].count;

        paymentItemDiv.appendChild(paymentMethodName); // Append paragraph elements to the payment method div (corrected variable name)
        paymentItemDiv.appendChild(paymentMethodCount);

        paymentContainerDiv.appendChild(paymentItemDiv); // Append the payment method div to the container div
    }
    paymentMethodsDiv.appendChild(paymentContainerDiv);
}


function displayOrderStatusSummary(orderStatusSummary, orderStatusDiv) {

    orderStatusDiv.innerHTML = `<h3> Order Statuses <h3>`;

    const orderStatusContainerDiv = document.createElement('div'); // Create a container div to hold all order status divs
    orderStatusContainerDiv.classList.add('order-status-container');

    for (let i = 0; i < orderStatusSummary.length; i++) {
        let statusItemDiv = document.createElement('div'); // Create a div for each order status
        statusItemDiv.classList.add('status-item');

        let statusName = document.createElement('p'); // Create paragraph elements for status name and count
        statusName.innerHTML = orderStatusSummary[i]._id;
        let statusCount = document.createElement('p');
        statusCount.innerHTML = orderStatusSummary[i].count;

        statusItemDiv.appendChild(statusName); // Append paragraph elements to the status div
        statusItemDiv.appendChild(statusCount);

        orderStatusContainerDiv.appendChild(statusItemDiv); // Append the status div to the container div
    }

    orderStatusDiv.appendChild(orderStatusContainerDiv); // Append the container div to the specified orderStatusDiv
}




function successMessage(message) {
    Swal.fire({
      text: message,
      position: 'top',
      timer: 2000,
      background: 'green',
      color: 'white',
      showConfirmButton: false
    });
    return;
  }
  
  
  function failureMessage(message) {
    Swal.fire({
      text: message,
      position: 'top',
      timer: 2000,
      background: 'red',
      color: 'white',
      showConfirmButton: false
    });
    return;
  }
  
 
    function adminLogout() {
        Swal.fire({
            title: 'Are you sure?',
            text: "You will be logged out!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, log out!'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire(
                    'Logged out!',
                    'You have been logged out.',
                    'success'
                ).then(() => {
                    window.location.href = "/admin/adminLogout";
                });
            }
        });
    }


