(function() {
	var gInfoTitle = "", gInfo = "";
	var gBatteryListener;
	var gStorageListener;
	var gCpuLoadListener;
	var state = {
		"MaxStorageExceeded" : 0,
		"CurrentStorageValue" : 1
	};
	var totalCapacity;

	$(document).on('pageinit', '#pageone', init);

	function init() {
		// TODO:: Do your initialization job
		console.log("init called");
		registerHandlers();
		/**
		 * Displays the notification according to the selected option
		 * 
		 */
		function registerHandlers() {
			$('#batterylevel').click(function() {
				if ($(this).attr("checked")) {
					watchbatterylevel();
				} else {
					stopbatterylevel();
				}
			});

			$('#batterylevelFull').click(function() {
				if ($(this).attr("checked")) {
					alertOnFullLevel();
				}
			});

		}
	}

	/**
	 * Checks if the specified property is present in the system and starts a
	 * watch process to the corresponding property if it is present in the
	 * system
	 * 
	 * @param property :
	 *            receives the property of the system(storage, battery etc)
	 * @param onBatterySuccess :
	 *            callback interface specifying a success callback with
	 *            SystemInfoProperty as input argument
	 * @param SystemInfoOptions:
	 *            specify the high and low threshold values to be watched on
	 * 
	 */

	function batteryChargeCheck(battery, currentBatteryLevelNotification) {
		// FIXME: Use === instead of ==
		if (battery.isCharging === true) {
			try {
				// use a varible for the previoulsy posted notification.
				currentBatteryLevelNotification.content = "Battery state: Charging...";
				tizen.notification.update(currentBatteryLevelNotification);
			} catch (err) {
				console.log(err.name + ": " + err.message);
			}

		} else {
			try {
				// use a varible for the previoulsy posted notification.
				currentBatteryLevelNotification.content = "Battery state: Not charging";
				tizen.notification.update(currentBatteryLevelNotification);
			} catch (err) {
				console.log(err.name + ": " + err.message);
			}
		}
	}

	function postBatteryNotification(battery) {
		// alert("The battery level is " + battery.level);
		if (battery.level > 0.9) {
			try {

				var notificationDict = {
					content : "battery is full charged. Disconnect the charger",
					iconPath : "assests/bat_full.png.jpg"

				};
				var currentBatteryLevelNotification = new tizen.StatusNotification(
						"SIMPLE", "battery is full charged", notificationDict);

				tizen.notification.post(currentBatteryLevelNotification);
			} catch (err) {
				console.log(err.name + ": " + err.message);
			}

		} else if (battery.level <= 0.2) {
			try {

				var notificationDict = {
					content : "battery is low. Connect the charger.",
					iconPath : "assests/bat_empty.png"

				};
				currentBatteryLevelNotification = new tizen.StatusNotification(
						"SIMPLE", "battery is low", notificationDict);

				tizen.notification.post(currentBatteryLevelNotification);
			} catch (err) {
				console.log(err.name + ": " + err.message);
			}
		}
		batteryChargeCheck(battery, currentBatteryLevelNotification);
	}

	function onBatterySuccess(battery) {
		console.log(battery.level);
		postBatteryNotification(battery);

	}

	function watchbatterylevel() {
		try {
			// onBatterySuccess()
			// listener for monitoring battery level change on high and low
			// thresholds
			gBatteryListener = tizen.systeminfo.addPropertyValueChangeListener(
					"BATTERY", onBatterySuccess, {
						highThreshold : 0.9,
						lowThreshold : 0.2
					});
			// alert("Watching battery level started");
		} catch (e) {
			alert("Exception: " + e.message);
		}

	}

	function onFullBattery(battery) {
		console.log(battery.level);
		if (battery.level > 0.9) {
			try {
				 tau.openPopup("#popupToast");
			} catch (err) {
				console.log(err.name + ": " + err.message);
			}

		}

		function alertOnFullLevel() {
			try {
				// onBatterySuccess()
				// listener for monitoring battery level change on high and low
				// thresholds
				gBatteryListener = tizen.systeminfo
						.addPropertyValueChangeListener("BATTERY",
								onFullBattery, {
									highThreshold : 0.9
								});
				// alert("battery Full level alert started");
			} catch (e) {
				alert("Exception: " + e.message);
			}

		}

		function onErrorCallback(error) {
			console.log("An error occurred " + error.message);

		}
		/**
		 * Posts notification by forming the icon, statement, description of the
		 * battery level
		 * 
		 */

		/**
		 * Updates the notification on the charging state of the battery
		 * 
		 * 
		 */

		function stopbatterylevel() {
			// alert("Watching battery level stopped");
			if (gBatteryListener !== null)
				tizen.systeminfo
						.removePropertyValueChangeListener(gBatteryListener);
		}

		$(document).delegate("#pageone", "pageinit", function() {
			$("#main .ui-btn-back").bind("vclick", function() {
				hideApp();
				return false;
			})
		});

		function hideApp() {
			
				var app = tizen.application.getCurrentApplication();
				app.hide();
			
		}
		
		function exitFromApp() {
			var r = confirm("Do you want to exit from this app?:");
			if (r === true) {
				var app = tizen.application.getCurrentApplication();
				app.exit();
			} else {
				return;
			}
		}
	}
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
})();