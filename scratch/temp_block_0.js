
            const bannerMessages = [
                { text: "💬 Type 'roulette' in chat to play!", color: "#ffff00" },
                { text: "<img src='pig/pig kid.png' style='width:24px;height:24px;vertical-align:middle;'> 10 Pigs = 1 Coin", color: "#ff5555" },
                { text: "<img src='animais bonus/ovelha/Ovelha kid.png' style='width:24px;height:24px;vertical-align:middle;'> 10 Sheep = 1 Coin", color: "#ffaa44" },
                { text: "🎁 2 Gifts = 1 Coin", color: "#ff88ff" },
                { text: "<img src='rolette.png' style='width:24px;height:24px;vertical-align:middle;'> Use your Coins to spin the roulette", color: "#ffd700" },
                { text: "🚀 Multiply your Coins or win extra skills", color: "#00ffff" }
            ];
            let currentBannerIndex = 0;
            setInterval(() => {
                const banner = document.getElementById('bannerText');
                if (!banner) return;
                banner.style.opacity = 0;
                setTimeout(() => {
                    currentBannerIndex = (currentBannerIndex + 1) % bannerMessages.length;
                    banner.innerHTML = bannerMessages[currentBannerIndex].text;
                    banner.style.color = bannerMessages[currentBannerIndex].color;
                    banner.style.opacity = 1;
                }, 500);
            }, 3000);
        