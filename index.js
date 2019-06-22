/**
 * mqtt-node-benchmark
 * 
 * @author Jiri Hybek <jiri@hybek.cz>
 * @license MIT
 * @copyright 2019 Jiri Hybek
 */

// Imports
const ArgumentParser = require("argparse").ArgumentParser;
const { fork } = require('child_process');

/*
 * Parse arguments
 */
var parser = new ArgumentParser({
	version: "1.0.0",
	addHelp: true,
	description: "MQTT Benchmark Tool"
});

parser.addArgument(
	[ "-s" ],
	{
		dest: "server",
		help: "Server URL (eg.: mqtt://user:pass@test.mosquitto.org)",
		required: true
	}
);

parser.addArgument(
	[ "-t" ],
	{
		dest: "topic",
		help: "Topic",
		required: true
	}
);

parser.addArgument(
	[ "-m" ],
	{
		dest: "msg",
		help: "Message",
		defaultValue: null
	}
);

parser.addArgument(
	[ "-q" ],
	{
		dest: "qos",
		help: "QoS Level",
		type: "int",
		defaultValue: 0
	}
);

parser.addArgument(
	[ "-S" ],
	{
		dest: "script",
		help: "Script filename to alter message (msg: { topic: string, payload: string }) => msg",
		defaultValue: null
	}
);

parser.addArgument(
	[ "-pT" ],
	{
		dest: "pub_threads",
		help: "Publish threads",
		type: "int",
		defaultValue: 5
	}
);

parser.addArgument(
	[ "-pC" ],
	{
		dest: "pub_connections",
		help: "Publish connections",
		type: "int",
		defaultValue: 10
	}
);

parser.addArgument(
	[ "-sT" ],
	{
		dest: "sub_threads",
		help: "Subscribe threads",
		type: "int",
		defaultValue: 1
	}
);

parser.addArgument(
	[ "-sC" ],
	{
		dest: "sub_connections",
		help: "Subscribe connections",
		type: "int",
		defaultValue: 2
	}
);

parser.addArgument(
	[ "-d" ], 
	{
		dest: "duration",
		help: "Duration (seconds)",
		type: "int",
		required: true
	}
);

/**
 * Runs worker process
 *
 * @param {*} params Connection and benchmark params
 */
async function runWorker(params) {

	return new Promise((resolve, reject) => {

		const worker = fork(__dirname + "/worker.js");

		worker.on("message", resolve);
		worker.on("error", reject);

		worker.on('exit', (code) => {
			if (code !== 0)
				reject(new Error(`Worker stopped with exit code ${code}`));
		});

		worker.send(params);

	});

}

/**
 * Start benchmark
 *
 * @param {*} args CLI args
 */
async function start(args) {

	const tasks = [];
	
	// Run publish workers
	for (let i = 0; i < args.pub_threads; i++) {
	
		tasks.push(runWorker({
			action: "publish",
			server: args.server,
			topic: args.topic,
			msg: args.msg,
			qos: args.qos,
			script: args.script,
			connections: Math.floor(args.pub_connections / args.pub_threads),
			duration: args.duration,
			threadId: "p" + i
		}));
	
	}
	
	// Run subscribe workers
	for (let i = 0; i < args.sub_threads; i++) {
	
		tasks.push(runWorker({
			action: "subscribe",
			server: args.server,
			topic: args.topic,
			qos: args.qos,
			connections: Math.floor(args.sub_connections / args.sub_threads),
			duration: args.duration,
			threadId: "s" + i
		}));
	
	}
	
	// Wait for results
	const results = await Promise.all(tasks);

	// Aggregate results
	let msgSent = 0;
	let msgReceived = 0;
	let errors = 0;
	let reconnects = 0;
	let wasConnected = 0;
	let wasSubscribed = 0;
	let minDuration = null;
	let sumDuration = 0;
	let maxDuration = null;

	for (let i = 0; i < results.length; i++) {

		msgSent += results[i].msgSent;
		msgReceived += results[i].msgReceived
		errors += results[i].errors;
		reconnects += results[i].reconnects;
		wasConnected += results[i].wasConnected;
		wasSubscribed += results[i].wasSubscribed;
		sumDuration += results[i].avgDuration
		minDuration = Math.min(minDuration, results[i].minDuration);
		maxDuration = Math.max(maxDuration, results[i].maxDuration);

	}

	return {
		msgSent: msgSent,
		msgReceived: msgReceived,
		errors: errors,
		reconnects: reconnects,
		wasConnected: wasConnected,
		wasSubscribed: wasSubscribed,
		reqConnections: args.pub_connections + args.sub_connections,
		reqSubscriptions: args.sub_connections,
		minDuration: minDuration,
		avgDuration: sumDuration / results.length,
		maxDuration: maxDuration
	}

}

/*
 * Start
 */
const args = parser.parseArgs();

start(args).then((results) => {

	// console.dir(results, { depth: null });
	console.log("Sent:       %d", results.msgSent);
	console.log("Received:   %d", results.msgReceived);
	console.log("Errors:     %d", results.errors);
	console.log("Reconnects: %d", results.reconnects);
	console.log("---");
	console.log("Min duration: %d seconds", results.minDuration);
	console.log("Avg duration: %d seconds", results.avgDuration);
	console.log("Max duration: %d seconds", results.maxDuration);
	console.log("Sent:         %d / second", results.msgSent / results.maxDuration);
	console.log("Received:     %d / second", results.msgReceived / results.maxDuration);
	console.log("---");
	console.log("Estabilished connections:   %d / %d", results.wasConnected, results.reqConnections);
	console.log("Estabilished subscriptions: %d / %d", results.wasSubscribed, results.reqSubscriptions);

	process.exit();

}, (err) => {

	console.error(err);
	process.exit();

});
