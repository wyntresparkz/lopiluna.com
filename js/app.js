document.addEventListener("DOMContentLoaded", () => {
    // ---- Viewport height tracking (mobile keyboard awareness) ----
    const setAppHeight = () => {
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        document.body.style.setProperty('--app-height', `${vh}px`);
    };
    setAppHeight();
    window.addEventListener('resize', setAppHeight);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', setAppHeight);
        window.visualViewport.addEventListener('scroll', setAppHeight);
    }

    const terminalContent = document.getElementById("terminal-content");
    const terminalInputArea = document.getElementById("terminal-input-area");
    const typingBuffer = document.getElementById("typing-buffer");
    const hiddenInput = document.getElementById("hidden-input");
    const promptPrefix = document.getElementById("prompt-prefix");
    const inputContainer = document.getElementById("input-container");

    let state = "BOOTING"; // States: BOOTING, LOGIN_USER, LOGIN_PASS, SYSTEM
    let username = "";

    const bootSequence = [
        { text: "[LOAD] INITIALIZING LOPILUNA_CORE_90s...", class: "text-pink-500", delay: 400 },
        { text: "[BOOT] VERIFYING GLITCH_AESTHETIC... [OK]", class: "text-pink-400", delay: 300 },
        { text: "[SYSM] MOUNTING RETROPUNK PROTO... [OK]", class: "text-pink-400", delay: 300 },
        { text: "[AUTH] INITIALIZING FIREWALLS... [OK]", class: "text-pink-600", delay: 600 },
        { text: "[CRIT] NEON LEVELS AT MAX INTENSITY", class: "text-yellow-500", delay: 400 },
        { text: "--------------------------------------", class: "text-faint", delay: 100 },
        { text: "[READY] SYSTEM INITIALIZED. AUTHORIZATION REQUIRED.", class: "text-green-500", delay: 500 }
    ];

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const printLine = (text, className = "text-pink-400") => {
        const p = document.createElement('p');
        p.className = className;
        p.innerHTML = text; // allow basic html matching 
        terminalContent.appendChild(p);
        terminalContent.scrollTop = terminalContent.scrollHeight;
    };

    const runBootSequence = async () => {
        terminalContent.innerHTML = '';
        for (let line of bootSequence) {
            await sleep(line.delay);
            printLine(line.text, line.class);
        }

        await sleep(500);
        terminalInputArea.style.opacity = '1';

        transitionToState("LOGIN_USER");
    };

    const transitionToState = (newState) => {
        state = newState;
        hiddenInput.value = "";
        typingBuffer.textContent = "";

        const saveToGuestbook = async (name) => {
            let localGB = JSON.parse(localStorage.getItem("lopi_guestbook") || "[]");
            const isDuplicate = localGB.some(existing => existing.toLowerCase() === name.toLowerCase());
            if (!isDuplicate) {
                localGB.push(name);
                localStorage.setItem("lopi_guestbook", JSON.stringify(localGB));
            }
            try {
                const res = await fetch('/api/guestbook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                if (!res.ok) console.error("Guestbook POST failed:", res.status, await res.text());
            } catch(e) {
                console.error("Guestbook API Error:", e);
            }
        };

        const fetchGuestbook = async () => {
            let list = JSON.parse(localStorage.getItem("lopi_guestbook") || "[]");
            try {
                let res = await fetch('/api/guestbook');
                if (res.ok) {
                    let cl = await res.json();
                    if (Array.isArray(cl) && cl.length > 0) list = cl;
                } else {
                    console.error("Guestbook GET failed:", res.status);
                }
            } catch(e) {
                console.error("Guestbook Fetch Error:", e);
            }
            
            if (list.length === 0) {
                printLine("No signatures detected.", "text-faint");
            } else {
                printLine(`<br/>[ ${list.length} UNIQUE VISITORS CAPTURED ]`, "text-green-500");
                const p = document.createElement("p");
                p.className = "text-white mt-2";
                p.style.wordBreak = "break-word";
                p.style.lineHeight = "1.5";
                p.innerHTML = list.map(n => `<span style="color:var(--primary-pink); margin-right:0.5rem; white-space:nowrap;">[${n}]</span>`).join(" ");
                document.getElementById("terminal-content").appendChild(p);
                document.getElementById("terminal-content").scrollTop = document.getElementById("terminal-content").scrollHeight;
            }
        };

        // Attach globally so processInput can reach it later without messy scoping
        window.saveToGuestbookAPI = saveToGuestbook;
        window.fetchGuestbookAPI = fetchGuestbook;

        if (state === "LOGIN_USER") {
            promptPrefix.textContent = "Username:";
            hiddenInput.type = "text";
            hiddenInput.focus();
        } else if (state === "LOGIN_PASS") {
            promptPrefix.textContent = "Password:";
            // Note: on mobile this might break the keyboard style, but we'll use a visual mask for now
            hiddenInput.type = "text";
            hiddenInput.focus();
        } else if (state === "SYSTEM") {
            const displayHost = (username.toLowerCase() === "lopi") ? "LopiLuna" : username.toLowerCase();
            promptPrefix.textContent = `${displayHost}@host \x3e`;
            hiddenInput.type = "text";
            hiddenInput.focus();
            
            if (username.toLowerCase() === "lopi") {
                printLine("<br/>[ACCESS GRANTED] Welcome back, System Admin.", "text-green-500");
                printLine("Type 'help' to see available commands.", "text-pink-400");
            } else {
                printLine(`<br/>[GUEST LOGIN] Welcome to the underground, ${username}.`, "text-green-500");
                printLine("Type 'help' to see public commands.", "text-pink-400");
            }
        }
    };

    // Keep input focused if they click anywhere in the terminal
    document.addEventListener("click", () => {
        if (state !== "BOOTING" && !gameActive) {
            hiddenInput.focus();
        }
    });

    // Mirror hidden input to visible buffer
    hiddenInput.addEventListener("input", (e) => {
        if (state === "LOGIN_PASS") {
            // Mask the password visually
            typingBuffer.textContent = "*".repeat(hiddenInput.value.length);
        } else {
            typingBuffer.textContent = hiddenInput.value;
        }
    });

    // Handle Enter key
    hiddenInput.addEventListener("keydown", (e) => {
        if (gameActive) return; // Block background execution

        if (e.key === "Enter") {
            const val = hiddenInput.value.trim();
            const rawVal = hiddenInput.value; // including spaces

            // Print what the user typed before processing it
            if (state === "LOGIN_PASS") {
                printLine(`${promptPrefix.textContent} ` + "*".repeat(rawVal.length), "text-pink-400");
            } else {
                printLine(`${promptPrefix.textContent} ${rawVal}`, "text-pink-400");
            }

            processInput(val);
        }
    });

    // Define the private services and their target subdomains
    const privateServices = {
        "cloud": "https://cloud.lopiluna.com",
        "mail": "https://mail.lopiluna.com",
        "music": "https://music.lopiluna.com",
        "admin": "https://admin.lopiluna.com"
    };

    const processInput = (val) => {
        if (state === "LOGIN_USER") {
            let inputName = val.trim();
            if (inputName === "") return;
            
            username = inputName;
            
            if (inputName.toLowerCase() === "lopi") {
                transitionToState("LOGIN_PASS");
            } else if (inputName.toLowerCase() === "secret") {
                printLine(">> EASTER EGG UNLOCKED: Playing soundbite...", "text-green-500");
                transitionToState("LOGIN_USER");
            } else {
                window.saveToGuestbookAPI(inputName);
                transitionToState("SYSTEM");
            }
        } else if (state === "LOGIN_PASS") {
            if (val === "1234") {
                transitionToState("SYSTEM");
            } else {
                printLine("[ERROR] Invalid password.", "text-yellow-500");
                transitionToState("LOGIN_USER");
            }
        } else if (state === "SYSTEM") {
            const cmd = val.toLowerCase();
            if (cmd === "") {
                return;
            }

            if (cmd === "help") {
                printLine("Available commands:", "text-pink-400");
                printLine("  whoami     - Display identity", "text-pink-500");
                printLine("  clear      - Clear the terminal", "text-pink-500");
                if (username.toLowerCase() === "lopi") {
                    printLine("  services   - Access portal", "text-green-500");
                    printLine("  guestbook  - View visitors", "text-green-500");
                }
                printLine("  discord    - Join the community", "text-pink-500");
                printLine("  tamalopi   - Launch Virtual Pet", "text-pink-500");
                printLine("  logout     - Exit session", "text-pink-500");
            } else if (cmd === "whoami") {
                printLine("LopiLuna - The Retro-Punk vTuber entity.", "text-pink-600");
            } else if (cmd === "services") {
                if (username.toLowerCase() !== "lopi") {
                    printLine("[ ACCESS DENIED: Requires SYSTEM_ADMIN ]", "text-yellow-500");
                    return;
                }
                printLine("SECURE DIRECTORY LOADED:", "text-green-500");
                Object.keys(privateServices).forEach(svc => {
                    printLine(`  [ ${svc} ] - Launch module`, "text-pink-400");
                });
                printLine("Type the name of a service to connect.", "text-faint");
            } else if (cmd === "guestbook") {
                if (username.toLowerCase() !== "lopi") {
                    printLine("[ ACCESS DENIED: Requires SYSTEM_ADMIN ]", "text-yellow-500");
                    return;
                }
                printLine("Polling secure databanks...", "text-faint");
                window.fetchGuestbookAPI();
            } else if (cmd === "discord") {
                printLine("Do you want to join via QR code or direct Link? [Q/L]", "text-pink-400");
                state = "DISCORD_PROMPT";
                promptPrefix.textContent = "QR/Link \x3e";
            } else if (privateServices[cmd]) {
                if (username.toLowerCase() !== "lopi") {
                    printLine("[ ACCESS DENIED: Requires SYSTEM_ADMIN ]", "text-yellow-500");
                    return;
                }
                printLine(`Initiating secure handshake to ${cmd.toUpperCase()} gateway...`, "text-green-500");
                printLine("Opening in new window...", "text-faint");
                setTimeout(() => {
                    window.open(privateServices[cmd], '_blank');
                }, 800);
            } else if (cmd === "snake") {
                startSnakeGame();
            } else if (cmd === "tamalopi") {
                openTamalopi();
            } else if (cmd === "clear") {
                terminalContent.innerHTML = '';
            } else if (cmd === "logout") {
                printLine("Terminating session...", "text-faint");
                setTimeout(() => {
                    transitionToState("LOGIN_USER");
                }, 1000);
                return;
            } else {
                // If it's not a standard command or service, it could be a logged-in Easter Egg!
                if (cmd === "punk") {
                    printLine(">> ERROR: TOO MUCH NEON INJECTED INTO MAINFRAME", "text-pink-600");
                } else {
                    printLine(`Command not found: ${cmd}`, "text-yellow-500");
                }
            }

            hiddenInput.value = "";
            typingBuffer.textContent = "";

        } else if (state === "DISCORD_PROMPT") {
            const answer = val.toLowerCase();
            if (answer === "q" || answer === "qr") {
                printLine("Generating dimensional QR anchor...", "text-green-500");
                printLine("<br/>", "text-faint");
                printLine("<img src='Streamer assets/discordinv.png' alt='Discord QR Code' onload='document.getElementById(\"terminal-content\").scrollTop = document.getElementById(\"terminal-content\").scrollHeight;' style='max-width: 280px; max-height: 45vh; width: 100%; object-fit: contain; border: 2px solid var(--primary-pink); border-radius: 0.5rem; display: block; margin: 0.5rem 0;'>", "");
                printLine("<br/>[ Scan to enter domain ]", "text-faint");
            } else if (answer === "l" || answer === "link") {
                printLine("Establishing direct connection line...", "text-green-500");
                printLine("<a href='https://discord.gg/Dqmbhw36Xv' target='_blank' style='color:#f472b6; text-decoration:underline;'>https://discord.gg/Dqmbhw36Xv</a>", "text-pink-400");
            } else {
                printLine("Command aborted.", "text-yellow-500");
            }
            
            state = "SYSTEM";
            const displayHost = (username.toLowerCase() === "lopi") ? "LopiLuna" : username.toLowerCase();
            promptPrefix.textContent = `${displayHost}@host \x3e`;
            hiddenInput.value = "";
            typingBuffer.textContent = "";
        }
    };

    runBootSequence();

    // -- Snake Elements --
    const snakeWindow = document.getElementById("snake-window");
    const snakeCloseBtn = document.getElementById("snake-closeBtn");
    const snakeCanvas = document.getElementById("snake-canvas");
    const ctx = snakeCanvas.getContext("2d");

    // ==================== SNAKE GAME LOGIC ====================
    let snakeInterval;
    let snakeBody = [];
    let food = {};
    let dx = 1; let dy = 0;
    const gridCount = 20;
    let gridSizeX, gridSizeY;
    let gameActive = false;
    let inputLocked = false;
    let nameEntryActive = false;
    let leaderboardActive = false;
    let nameChars = ['A', 'A', 'A'];
    let activeCharIndex = 0;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?_ ";
    const snakeScoreUI = document.getElementById("snake-score");

    const resizeCanvas = () => {
        snakeCanvas.width = 400;
        snakeCanvas.height = 400;
        gridSizeX = snakeCanvas.width / gridCount;
        gridSizeY = snakeCanvas.height / gridCount;
    };

    const startSnakeGame = async () => {
        if (gameActive) return;
        gameActive = true;
        snakeWindow.style.display = "flex";
        hiddenInput.blur(); // Stop mobile keyboard
        resizeCanvas();
        snakeBody = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        dx = 1; dy = 0;
        inputLocked = true; // Lock input during countdown
        placeFood();
        snakeScoreUI.textContent = "SCORE: 0";
        drawSnake(); // Draw initial graphics behind countdown

        // 3-second visual countdown loop
        ctx.textAlign = "center";
        for (let i = 3; i > 0; i--) {
            if (!gameActive) return; // Abort async process if window is closed early
            drawSnake();
            ctx.fillStyle = "rgba(20,0,5,0.6)";
            ctx.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);
            ctx.fillStyle = "#f472b6";
            ctx.font = "bold 60px 'Fira Code', monospace";
            ctx.shadowBlur = 15; ctx.shadowColor = "#f472b6";
            ctx.fillText(i.toString(), snakeCanvas.width / 2, snakeCanvas.height / 2 + 20);
            ctx.shadowBlur = 0;
            await sleep(1000);
        }
        if (!gameActive) return; // Final verification lock

        inputLocked = false;
        snakeInterval = setInterval(updateSnake, 120);
        document.addEventListener("keydown", handleSnakeKey);
    };

    const closeSnakeGame = () => {
        gameActive = false;
        snakeWindow.style.display = "none";
        clearInterval(snakeInterval);
        document.removeEventListener("keydown", handleSnakeKey);
        hiddenInput.focus();
        printLine("LOPI_SNAKE.EXE terminated.", "text-faint");
    };

    snakeCloseBtn.addEventListener("click", closeSnakeGame);

    const placeFood = () => {
        food = {
            x: Math.floor(Math.random() * gridCount),
            y: Math.floor(Math.random() * gridCount)
        };
        for (let segment of snakeBody) {
            if (segment.x === food.x && segment.y === food.y) {
                placeFood(); break;
            }
        }
    };

    const updateSnake = () => {
        inputLocked = false;
        const head = { x: snakeBody[0].x + dx, y: snakeBody[0].y + dy };

        // Wall Collision
        if (head.x < 0 || head.x >= gridCount || head.y < 0 || head.y >= gridCount) return gameOver();

        // Self Collision
        for (let segment of snakeBody) {
            if (head.x === segment.x && head.y === segment.y) return gameOver();
        }

        snakeBody.unshift(head);

        // Food Collision
        if (head.x === food.x && head.y === food.y) {
            placeFood();
        } else {
            snakeBody.pop();
        }

        drawSnake();
    };

    const drawSnake = () => {
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);

        // Draw Food
        ctx.fillStyle = "#22c55e";
        ctx.shadowBlur = 10; ctx.shadowColor = "#22c55e";
        ctx.fillRect(food.x * gridSizeX + 1, food.y * gridSizeY + 1, gridSizeX - 2, gridSizeY - 2);

        // Draw Snake
        ctx.fillStyle = "#ec4899";
        ctx.shadowBlur = 15; ctx.shadowColor = "#ec4899";
        for (let i = 0; i < snakeBody.length; i++) {
            ctx.fillStyle = i === 0 ? "#f472b6" : "#ec4899";
            ctx.fillRect(snakeBody[i].x * gridSizeX + 1, snakeBody[i].y * gridSizeY + 1, gridSizeX - 2, gridSizeY - 2);
        }
        ctx.shadowBlur = 0;
        snakeScoreUI.textContent = "SCORE: " + Math.max(0, (snakeBody.length - 3) * 10);
    };

    const gameOver = () => {
        clearInterval(snakeInterval);
        snakeInterval = null;
        ctx.fillStyle = "rgba(20,0,5,0.7)";
        ctx.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);

        let finalScore = Math.max(0, (snakeBody.length - 3) * 10);
        
        if (finalScore > 0) {
            gameActive = false; 
            nameEntryActive = true;
            nameChars = ['A', 'A', 'A'];
            activeCharIndex = 0;
            document.getElementById("snake-name-entry").classList.remove("hidden");
            renderNameEntry();
        } else {
            ctx.fillStyle = "#ff3333";
            ctx.font = "bold 30px 'Fira Code', monospace";
            ctx.textAlign = "center";
            ctx.shadowBlur = 10; ctx.shadowColor = "#ff3333";
            ctx.fillText("SYSTEM FAILURE", snakeCanvas.width / 2, snakeCanvas.height / 2 - 10);

            ctx.font = "16px 'Fira Code', monospace";
            ctx.fillStyle = "#f472b6";
            ctx.shadowBlur = 5; ctx.shadowColor = "#f472b6";
            ctx.fillText("[TAP TO REBOOT]", snakeCanvas.width / 2, snakeCanvas.height / 2 + 30);
            ctx.shadowBlur = 0;
            
            gameActive = false; // Bug fix: unlock restart flow on zero point gameover
        }
    };

    snakeCanvas.addEventListener("click", () => {
        if (!gameActive && !snakeInterval && !nameEntryActive && !leaderboardActive) {
            startSnakeGame();
        }
    });

    const handleSnakeKey = (e) => {
        if (!gameActive && !nameEntryActive) return; // Terminate unconditionally if functionally closed

        const validKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'Enter'];
        if (validKeys.includes(e.key)) e.preventDefault();

        if (nameEntryActive) {
            if (e.key === "ArrowUp" || e.key === "w") changeLetter(activeCharIndex, 1);
            else if (e.key === "ArrowDown" || e.key === "s") changeLetter(activeCharIndex, -1);
            else if (e.key === "ArrowLeft" || e.key === "a") { activeCharIndex = Math.max(0, activeCharIndex - 1); renderNameEntry(); }
            else if (e.key === "ArrowRight" || e.key === "d") { activeCharIndex = Math.min(2, activeCharIndex + 1); renderNameEntry(); }
            else if (e.key === "Enter") submitScore();
            return;
        }

        if (!gameActive || inputLocked) return;

        switch (e.key) {
            case "ArrowUp": case "w": if (dy === 0) { dx = 0; dy = -1; inputLocked = true; } break;
            case "ArrowDown": case "s": if (dy === 0) { dx = 0; dy = 1; inputLocked = true; } break;
            case "ArrowLeft": case "a": if (dx === 0) { dx = -1; dy = 0; inputLocked = true; } break;
            case "ArrowRight": case "d": if (dx === 0) { dx = 1; dy = 0; inputLocked = true; } break;
        }
    };

    let touchStartX = 0; let touchStartY = 0;
    snakeCanvas.addEventListener("touchstart", e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    snakeCanvas.addEventListener("touchend", e => {
        let touchEndX = e.changedTouches[0].screenX;
        let touchEndY = e.changedTouches[0].screenY;
        let diffX = touchEndX - touchStartX;
        let diffY = touchEndY - touchStartY;

        if (nameEntryActive) {
            if (Math.abs(diffX) < 20 && Math.abs(diffY) < 20) { submitScore(); return; } // tap to submit
            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > 0) { activeCharIndex = Math.min(2, activeCharIndex + 1); renderNameEntry(); }
                else { activeCharIndex = Math.max(0, activeCharIndex - 1); renderNameEntry(); }
            } else {
                if (diffY > 0) changeLetter(activeCharIndex, -1);
                else changeLetter(activeCharIndex, 1);
            }
            return;
        }

        if (!gameActive) {
            if (!snakeInterval && !leaderboardActive) startSnakeGame();
            return;
        }

        if (Math.abs(diffX) < 20 && Math.abs(diffY) < 20) return;
        if (inputLocked) return;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0 && dx === 0) { dx = 1; dy = 0; inputLocked = true; }
            else if (diffX < 0 && dx === 0) { dx = -1; dy = 0; inputLocked = true; }
        } else {
            if (diffY > 0 && dy === 0) { dx = 0; dy = 1; inputLocked = true; }
            else if (diffY < 0 && dy === 0) { dx = 0; dy = -1; inputLocked = true; }
        }
    }, { passive: true });

    // ==================== Arcade UI Logic ====================
    const renderNameEntry = () => {
        const container = document.getElementById("arcade-inputs");
        container.innerHTML = "";
        for (let i = 0; i < 3; i++) {
            const col = document.createElement("div");
            col.className = `letter-col ${i === activeCharIndex ? "active" : ""}`;
            col.innerHTML = `
                <div class="arrow up">▲</div>
                <div class="letter-box">${nameChars[i]}</div>
                <div class="arrow down">▼</div>
            `;
            col.querySelector(".up").onclick = () => changeLetter(i, 1);
            col.querySelector(".down").onclick = () => changeLetter(i, -1);
            col.querySelector(".letter-box").onclick = () => { activeCharIndex = i; renderNameEntry(); };
            container.appendChild(col);
        }
    };

    const changeLetter = (index, dir) => {
        activeCharIndex = index;
        let charIdx = alphabet.indexOf(nameChars[index]) || 0;
        charIdx += dir;
        if (charIdx < 0) charIdx = alphabet.length - 1;
        if (charIdx >= alphabet.length) charIdx = 0;
        nameChars[index] = alphabet[charIdx];
        renderNameEntry();
    };

    document.getElementById("snake-name-entry").onclick = (e) => {
        // Only trigger submit if they clicked the wrapper, not the arrows
        if(e.target.id === "snake-name-entry" && nameEntryActive) submitScore();
    };

    const submitScore = async () => {
        if(!nameEntryActive) return;
        nameEntryActive = false;
        document.getElementById("snake-name-entry").classList.add("hidden");
        
        let finalName = nameChars.join("");
        let finalScore = Math.max(0, (snakeBody.length - 3) * 10);
        
        // Mock API Call (LocalStorage)
        let scores = JSON.parse(localStorage.getItem("lopi_snake_scores") || "[]");
        scores.push({ name: finalName, score: finalScore });
        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 20); // Keep top 20
        localStorage.setItem("lopi_snake_scores", JSON.stringify(scores));

        // Actual API Call (silent fail locally)
        try {
            const res = await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: finalName, score: finalScore })
            });
            if (!res.ok) console.error("Scores POST failed:", res.status, await res.text());
        } catch(e) {
            console.error("Scores API Error:", e);
        }

        showLeaderboard();
    };

    const showLeaderboard = async () => {
        leaderboardActive = true;
        const lbUi = document.getElementById("snake-leaderboard");
        const listUi = document.getElementById("leaderboard-list");
        lbUi.classList.remove("hidden");
        listUi.innerHTML = "<div class='text-center text-pink-400'>[LOADING DATA]</div>";

        let scores = JSON.parse(localStorage.getItem("lopi_snake_scores") || "[]");
        try {
            let res = await fetch('/api/scores');
            if(res.ok) {
                scores = await res.json();
            } else {
                console.error("Scores GET failed:", res.status);
            }
        } catch(e) {
            console.error("Scores Fetch Error:", e);
        }

        listUi.innerHTML = "";
        const top5 = scores.slice(0, 5);
        if (top5.length === 0) {
            listUi.innerHTML = "<div class='text-faint text-center p-2'>NO SCORES YET.</div>";
        } else {
            top5.forEach((s, i) => {
                listUi.innerHTML += `
                    <div class="leaderboard-item">
                        <span class="leaderboard-name">${i+1}. ${s.name}</span>
                        <span class="leaderboard-score">${s.score}</span>
                    </div>
                `;
            });
        }
    };

    document.getElementById("snake-leaderboard").onclick = () => {
        if(leaderboardActive) {
            leaderboardActive = false;
            document.getElementById("snake-leaderboard").classList.add("hidden");
            startSnakeGame();
        }
    };

    // ==================== TAMALOPI VIRTUAL PET ====================
    const tamaWindow = document.getElementById("tamalopi-window");
    const tamaCanvas = document.getElementById("tamalopi-canvas");
    const tCtx = tamaCanvas.getContext("2d");
    
    let tamaActive = false;
    let tamaLoop;
    let tamaSprite = new Image();
    tamaSprite.src = "Streamer assets/lopi-Sheet.png";
    
    let petData = { id: "", hunger: 100, happy: 100, lastUpdated: Date.now() };

    const TAMA_SPEED = 2; // px per frame
    const TAMA_SIZE = 96; // rendering size (scaled 2x)
    const TAMA_FRAME_SIZE = 48;
    
    let petX = 0, petY = 0;
    let petState = 0; // 0=Down, 1=Left, 2=Right, 3=Up
    let petAction = "idling"; 
    let petFrame = 0;
    let frameTicker = 0;
    let petTarget = {x: 0, y: 0};
    
    const generateUUID = () => Math.random().toString(36).substring(2, 8).toUpperCase();

    const loadPetData = async (syncId = null) => {
        let localData = localStorage.getItem("tamalopi_data");
        if (localData && !syncId) {
            petData = JSON.parse(localData);
        } else {
            if(!syncId) petData.id = generateUUID();
            else petData.id = syncId;
            petData.lastUpdated = Date.now();
        }

        // Mock API Fetch (Silent Load)
        try {
            let res = await fetch(`/api/pet?id=${petData.id}`);
            if (res.ok) {
                let cloudData = await res.json();
                if (cloudData.hunger !== undefined) {
                    petData = cloudData;
                }
            } else {
                console.error("Pet GET failed:", res.status);
            }
        } catch(e) {
            console.error("Pet Fetch Error:", e);
        }
        
        let now = Date.now();
        let minPassed = Math.floor((now - petData.lastUpdated) / 60000);
        if (minPassed > 0) {
            let decay = Math.floor(minPassed / 2); // 1 pt per 2 mins
            petData.hunger = Math.max(0, petData.hunger - decay);
            petData.happy = Math.max(0, petData.happy - Math.floor(decay * 0.5));
            petData.lastUpdated = now;
            savePetData();
        }
        updateStatBars();
    };

    const savePetData = async () => {
        petData.lastUpdated = Date.now();
        localStorage.setItem("tamalopi_data", JSON.stringify(petData));
        try {
            const res = await fetch("/api/pet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(petData)
            });
            if (!res.ok) console.error("Pet POST failed:", res.status);
        } catch(e) {
            console.error("Pet Save Error:", e);
        }
    };

    const updateStatBars = () => {
        document.getElementById("t-hunger-bar").style.width = petData.hunger + "%";
        document.getElementById("t-happy-bar").style.width = petData.happy + "%";
    };

    const openTamalopi = () => {
        if (tamaActive) return;
        tamaActive = true;
        tamaWindow.style.display = "flex";
        hiddenInput.blur();
        
        tamaCanvas.width = 400;
        tamaCanvas.height = 300;
        petX = 200 - TAMA_SIZE/2;
        petY = 150 - TAMA_SIZE/2;
        pickNewTarget();

        loadPetData();
        
        tamaLoop = setInterval(updateTamalopi, 1000/30);
    };

    const closeTamalopi = () => {
        tamaActive = false;
        tamaWindow.style.display = "none";
        clearInterval(tamaLoop);
        hiddenInput.focus();
        printLine("TAMALOPI.EXE saving to cloud...", "text-faint");
        savePetData();
    };

    document.getElementById("tamalopi-closeBtn").onclick = closeTamalopi;

    const pickNewTarget = () => {
        if (Math.random() > 0.5) {
            petAction = "walking";
            petTarget.x = Math.max(0, Math.min(tamaCanvas.width - TAMA_SIZE, petX + (Math.random() * 200 - 100)));
            petTarget.y = Math.max(0, Math.min(tamaCanvas.height - TAMA_SIZE, petY + (Math.random() * 200 - 100)));
            
            let dx = petTarget.x - petX;
            let dy = petTarget.y - petY;
            if (Math.abs(dx) > Math.abs(dy)) petState = dx > 0 ? 2 : 1; 
            else petState = dy > 0 ? 0 : 3; 
        } else {
            petAction = "idling";
            petTarget.x = petX;
            petTarget.y = petY;
        }
    };

    const updateTamalopi = () => {
        if (petAction === "walking") {
            let dx = petTarget.x - petX;
            let dy = petTarget.y - petY;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < TAMA_SPEED) {
                petX = petTarget.x;
                petY = petTarget.y;
                pickNewTarget();
            } else {
                petX += (dx/dist) * TAMA_SPEED;
                petY += (dy/dist) * TAMA_SPEED;
            }
        } else {
            if (Math.random() < 0.02) pickNewTarget(); 
        }

        frameTicker++;
        if (frameTicker > 6) {
            frameTicker = 0;
            if (petAction === "walking") {
                petFrame = (petFrame + 1) % 3; // Cycle legs
            } else {
                petFrame = 1; // Idle frame
            }
        }

        drawTamalopi();
    };

    const drawTamalopi = () => {
        tCtx.clearRect(0, 0, tamaCanvas.width, tamaCanvas.height);
        
        // Draw shadow
        tCtx.fillStyle = "rgba(0,0,0,0.3)";
        tCtx.beginPath();
        tCtx.ellipse(petX + TAMA_SIZE/2, petY + TAMA_SIZE - 10, 20, 8, 0, 0, Math.PI*2);
        tCtx.fill();

        // Draw Sprite
        tCtx.drawImage(
            tamaSprite,
            petFrame * TAMA_FRAME_SIZE,
            petState * TAMA_FRAME_SIZE,
            TAMA_FRAME_SIZE, TAMA_FRAME_SIZE,
            petX, petY,
            TAMA_SIZE, TAMA_SIZE 
        );
    };

    // UI Buttons
    document.getElementById("t-btn-feed").onclick = () => {
        petData.hunger = Math.min(100, petData.hunger + 15);
        updateStatBars();
        savePetData();
        petAction = "idling"; petState = 0; petFrame = 0;
    };
    document.getElementById("t-btn-play").onclick = () => {
        petData.happy = Math.min(100, petData.happy + 15);
        petData.hunger = Math.max(0, petData.hunger - 5);
        updateStatBars();
        savePetData();
        petAction = "walking"; pickNewTarget();
    };

    // Sync Logic
    const tSyncModal = document.getElementById("tamalopi-sync-modal");
    document.getElementById("t-btn-sync").onclick = () => {
        tSyncModal.classList.remove("hidden");
        document.getElementById("t-sync-display").innerText = petData.id;
    };
    document.getElementById("t-sync-close").onclick = () => {
        tSyncModal.classList.add("hidden");
    };
    document.getElementById("t-sync-btn").onclick = async () => {
        let val = document.getElementById("t-sync-input").value.trim().toUpperCase();
        if (val.length > 0) {
            document.getElementById("t-sync-btn").innerText = "WAIT...";
            await loadPetData(val);
            document.getElementById("t-sync-btn").innerText = "LOAD";
            tSyncModal.classList.add("hidden");
            document.getElementById("t-sync-input").value = "";
        }
    };
});
