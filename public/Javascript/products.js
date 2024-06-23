function logoutConfirmation() {
    var confirmLogout = confirm("Are you sure you want to logout?");
    if (confirmLogout) {
        // If user confirms logout, redirect to /userLogout
        window.location.href = "/userLogout";
    } else {
        window.location.href = "/userHome";

    }
}


console.log("Script loaded");

document.addEventListener('DOMContentLoaded', function() {
const sortDropdown = document.getElementById('sort-btn-dropdwon');
const sortingForm = document.getElementById('formSorting');

function saveSelectedOption() {
    localStorage.setItem('selectedOption', sortDropdown.value);
}

function loadSelectedOption() {
    const selectedOption = localStorage.getItem('selectedOption');
    if (selectedOption) {
        sortDropdown.value = selectedOption;
    }
}

     sortDropdown.addEventListener('change', function() {
    console.log("Dropdown option changed");
    const selectedOption = sortDropdown.value;

    saveSelectedOption();

   
    sortingForm.action = `/userProductlist?sortBy=${selectedOption}`;

    
    console.log("Form action URL:", sortingForm.action);

    sortingForm.submit();
});

// Load selected option from local storage
loadSelectedOption();
});



