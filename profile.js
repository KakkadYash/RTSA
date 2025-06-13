const fileInput = document.getElementById("file-input");
const imagePreview = document.getElementById("img-preview");

// Restore image on page load
window.addEventListener("DOMContentLoaded", () => {
  const savedImage = localStorage.getItem("profilePic");
  if (savedImage) {
    imagePreview.src = savedImage;
  }
});

// Save new image to localStorage when uploaded
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const base64Image = event.target.result;
      imagePreview.src = base64Image;
      localStorage.setItem("profilePic", base64Image);
    };
    reader.readAsDataURL(file);
  }
});