async function run() {
    try {
        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'doesnotexist@edusy.com',
                password: '123'
            })
        });
        const status = response.status;
        const data = await response.json();
        console.log('STATUS:', status);
        console.log('DATA:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('FETCH ERROR:', e);
    }
}
run();
