function logoutConfirmation() {
    var confirmLogout = confirm("Are you sure you want to logout?");
    if (confirmLogout) {
        // If user confirms logout, redirect to /userLogout
        window.location.href = "/userLogout";
    } else {
        window.location.href = "/userHome";

    }
}