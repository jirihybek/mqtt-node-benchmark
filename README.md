# mqtt-node-benchmark

CLI utility to run MQTT benchmarks via Node.js.

## Usage

```
usage: index.js [-h] [-v] -s SERVER -t TOPIC [-m MSG] [-q QOS] [-S SCRIPT]
                [-pT PUB_THREADS] [-pC PUB_CONNECTIONS] [-sT SUB_THREADS]
                [-sC SUB_CONNECTIONS] -d DURATION
```

### Custom Script

You can use custom Node.js module to generate custom server info, message params and subscription params.

```javascript
module.exports = {
	getServer: (_params) => {

		return "mqtt://user:pass@test.mosquitto.org";

	},
	getMessage: (params) => {

		return {
			topic: params.topic + "/test" + Math.floor(Math.random() * 30),
			qos: params.qos,
			payload: JSON.stringify({
				t: Date.now() / 1000,
				v: Math.random()
			})
		}
	
	},
	getSubscriptionTopic: (_params) => {
	
		return {
			topic: params.topic + "/test" + Math.floor(Math.random() * 30),
			qos: 2
		};
		
	}
};
```

## License

The MIT License (MIT)

Copyright (c) 2019 Jiri Hybek jiri@hybek.cz (jiri.hybek.cz)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.