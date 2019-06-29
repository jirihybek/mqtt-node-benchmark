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
}