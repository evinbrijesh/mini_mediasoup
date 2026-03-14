import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({
            headless: true, args: [
                '--use-fake-ui-for-media-stream',
                '--use-fake-device-for-media-stream'
            ]
        });

        async function joinRoom(name, roomIdToJoin = null) {
            const page = await browser.newPage();
            page.on('console', msg => console.log(`[${name}] ${msg.type()}: ${msg.text()}`));
            await page.goto('http://localhost:5173/');

            // wait for input
            await page.waitForSelector('.input-field');
            await page.type('.input-field', name);

            let roomId = roomIdToJoin;
            if (!roomId) {
                await page.click('.btn-new-meeting');
                roomId = await page.$eval('.input-code', el => el.value);
            } else {
                await page.type('.input-code', roomId);
            }

            // wait for join button
            await page.waitForSelector('.btn-join-inside.active');
            await page.click('.btn-join-inside.active');

            return { page, roomId };
        }

        console.log("Starting User 1...");
        const user1 = await joinRoom('User 1');
        console.log(`User 1 joined room ${user1.roomId}`);

        await new Promise(r => setTimeout(r, 2000));

        console.log(`Starting User 2 for room ${user1.roomId}...`);
        const user2 = await joinRoom('User 2', user1.roomId);
        console.log(`User 2 joined`);

        await new Promise(r => setTimeout(r, 2000));

        console.log(`Starting User 3 for room ${user1.roomId}...`);
        const user3 = await joinRoom('User 3', user1.roomId);
        console.log(`User 3 joined`);

        await new Promise(r => setTimeout(r, 5000));

        // Count video tiles on each page
        const countTiles = async (p, n) => {
            const tiles = await p.$$eval('.video-tile', els => els.length);
            console.log(`[${n}] sees ${tiles} video tiles`);
        }

        await countTiles(user1.page, 'User 1');
        await countTiles(user2.page, 'User 2');
        await countTiles(user3.page, 'User 3');

        await browser.close();
    } catch (e) {
        console.error("Puppeteer error:", e);
        process.exit(1);
    }
})();
