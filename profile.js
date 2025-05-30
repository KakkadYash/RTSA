const fileInput = document.getElementById("file-input")
const imagePreview = document.getElementById("img-preview")
localStorage.setItem("profilePic", "Avatars");

fileInput.addEventListener("change", (e) => {
    if (e.target.files.length) {
        const src = URL.createObjectURL(e.target.files[0])
            imagePreview.src = src
    }
})
