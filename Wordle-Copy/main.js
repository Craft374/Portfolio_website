document.addEventListener("DOMContentLoaded", () => {
    CreateSquare();
    const keys = document.querySelectorAll('keyboard-row button')
    function CreateSquare() {
        const gameBoard = document.getElementById("board")
    
        for (let index = 0; index < 30; index++) {
            let square = document.createElement("div")
            square.classList.add("square")
            square.setAttribute("id", index + 1)
            gameBoard.appendChild(square)
        }
    }
});