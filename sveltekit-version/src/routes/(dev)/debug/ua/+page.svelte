<script>
	import { onMount } from 'svelte';

	let ua = '';
	let platform = '';
	let vendor = '';

	onMount(() => {
		ua = navigator.userAgent;
		platform = navigator.platform;
		vendor = navigator.vendor;
	});
</script>

<div class="p-8 font-sans max-w-2xl mx-auto">
	<h1 class="text-2xl font-bold mb-4">Debug User Agent</h1>

	<div class="bg-gray-100 p-4 rounded mb-4 shadow">
		<h2 class="font-bold mb-2">User Agent:</h2>
		<code class="break-all block bg-white p-2 rounded border border-gray-300">{ua}</code>
	</div>

	<div class="grid grid-cols-2 gap-4">
		<div class="bg-gray-100 p-4 rounded shadow">
			<h2 class="font-bold mb-2">Platform:</h2>
			<code class="break-all block bg-white p-2 rounded border border-gray-300">{platform}</code>
		</div>
		<div class="bg-gray-100 p-4 rounded shadow">
			<h2 class="font-bold mb-2">Vendor:</h2>
			<code class="break-all block bg-white p-2 rounded border border-gray-300">{vendor}</code>
		</div>
	</div>

	<div class="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
		<h3 class="font-bold text-yellow-800 mb-2">Recommended Kiosk Setting:</h3>
		<p class="mb-2">If you see "wv" or "Version/4.0 Chrome/..." in the User Agent, Google will block it.</p>
		<p class="mb-2">Change your Kiosk setting (Advanced Web Settings -> Fake User Agent) to:</p>
		<code class="block bg-yellow-100 p-2 rounded text-sm break-all select-all">Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36</code>
	</div>
    
    <div class="mt-8 text-center">
        <a href="/" class="text-blue-600 underline">Back to App</a>
    </div>
</div>
