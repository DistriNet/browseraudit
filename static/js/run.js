(function() {
	var testSandbox = $("div#sandbox");

	var categoryStack = [ browserAuditUI.testReportList ];

	var thisTest;

	var testResultsForUpload = {};

	// Callback functions for BrowserAudit test framework (which ones are used
	// depends on the display mode); all display modes require callback functions
	// for the events relating to the overall test suite (starting, ending,
	// pausing, resuming)
	var callbackFunctions = {
		startSuite: function(start) {
			// Remove all cookies that might have persisted from previous runs
			$.each([ window.domain1, window.domain1 + "/sop/path", window.subdomain1, window.domain2, window.subdomain2 ], function(i, v) {
				$("<img>", { src: "https://" + v + "/clear_cookies" }).appendTo(testSandbox);
			});

			// Create cookies used for CSP tests
			$.each([ window.domain1 ], function(i, v) {
				$("<img>", { src: "https://" + v + "/csp_cookie" }).appendTo(testSandbox);
			});

			testSandbox.waitForImages(function() {
				// Remove the cookie-clearing images from the sandbox, and mirror the
				// domain 1 session cookie that was set when we loaded the page
				// onto domain 2
				$("<img>", { src: "https://" + window.domain2 + "/set_sessid_cookie/" + $.cookie("sessid") }).appendTo(testSandbox);

				testSandbox.waitForImages(function() {
					// Reset local/session storage
					$("<iframe>", { src: "/static/reset_local_storage.html" }).appendTo(testSandbox).load(function() {
						$("<iframe>", { src: "https://" + window.subdomain1 + "/static/reset_local_storage.html" }).appendTo(testSandbox).load(function() {
							// Remove all elements from the test sandbox, and run the test suite
							testSandbox.empty();
							browserAuditUI.scoreboard.setTotal(browserAuditTestFramework.getTestTotal());
							browserAuditUI.notificationBar.setMessage("play", "The test suite is currently running. Click here to pause execution.", function() {
								browserAuditTestFramework.pause();
							});
							start();
						});
					});
				});
			});
		},

		pauseSuite: function() {
			browserAuditUI.notificationBar.setMessage("pause", "The test suite is currently paused. Click here to resume execution.", function() {
				browserAuditTestFramework.resume();
			});
		},

		resumeSuite: function() {
			browserAuditUI.notificationBar.setMessage("play", "The test suite is currently running. Click here to pause execution.", function() {
				browserAuditTestFramework.pause();
			});
		},

		endSuite: function(result) {
			// Send test suite results back to BA server, if permitted
			if (browserAuditSettings.sendresults) {
				var sendResults = function() {
					browserAuditUI.notificationBar.setMessage("cloud-upload", "Uploading results to server...", null);

					var suiteExecution = {
						testResults: testResultsForUpload
					};

					$.ajax({
						type: "POST",
						url: "https://app.experiment.websand.eu/test_results/" + window.location.search.substring(7),
						data: JSON.stringify(suiteExecution),
						dataType: "json",
						contentType: "application/json",
						success: function(data, status, xhr) {
							browserAuditUI.notificationBar.setMessage("off", "The test suite has finished executing and the results were sent, thank you!", null);
						},
						error: function(xhr, status, err) {
							// HTTP status code 400 indicates a problem with the JSON object
							// sent to the server - we shouldn't suggest resending it, because
							// it (probably) won't be accepted by the server next time either
							if (xhr.status == 400) {
								browserAuditUI.notificationBar.setMessage("off", "The test suite has finished executing, but test results were already received for this unique URL. Please generate a new one to upload test results for another device.", null);
							// Any other HTTP status code indicates some other problem not
							// related to the data we sent, and it might succeed if we try
							// sending it again
							} else {
								browserAuditUI.notificationBar.setMessage("off", "The test suite has finished executing, but there was a problem uploading the test results to the server. Click here to try sending them again.", sendResults);
							}
						}
					});
				};
				sendResults();
			} else {
				browserAuditUI.notificationBar.setMessage("off", "The test suite has finished executing.", null);
			}
		}
	};

	// If the display mode is "full", add callback functions that display
	// categories and tests in the BrowserAudit UI
	if (browserAuditSettings.displaymode === "full") {
		callbackFunctions.startCategory = function() {
			var thisCategory = browserAuditUI.testReportCategory(this.id, this.title, this.description);
			thisCategory.setActive(true);

			// Add this new category as a child of the next deepest category on the
			// stack, then insert this new category onto the stack itself
			categoryStack[0].addChild(thisCategory);
			categoryStack.unshift(thisCategory);
		};

		callbackFunctions.endCategory = function(result) {
			var thisCategory = categoryStack.shift();
			thisCategory.setActive(false);

			// Add labels next to the category title indicating how many tests in this
			// category failed/were skipped
			var allTestsPassed = true;
			if (result.critical > 0) { allTestsPassed = false; thisCategory.setOutcome("critical", result.critical); }
			if (result.warning > 0) { allTestsPassed = false; thisCategory.setOutcome("warning", result.warning); }
			if (result.skip > 0) { allTestsPassed = false; thisCategory.setOutcome("skip", result.skip); }

			// If all tests in this category were passed, collapse the category
			if (allTestsPassed) thisCategory.setCollapsed(true);
		};

		callbackFunctions.startTest = function() {
			thisTest = browserAuditUI.testReport(this.id, this.title, this.behaviour, this.timeout, this.testFunction, this.testFunction.reportData);

			// Add this new test as a child of the category on top of the stack
			categoryStack[0].addChild(thisTest);
		};
	}

	// The definition of the endTest callback function depends on the display
	// mode ("higher" display modes also perform all the actions included in
	// "lower" modes):
	// - "full": include the test outcome in the BrowserAudit UI
	// - "summary": update the scoreboard
	// - "none": empty the sandbox <div> used to hold test iframes; record result
	//   of test if we need to send it back to the server at the end
	callbackFunctions.endTest = function(duration, result) {
		// Remove iframes added to the test sandbox by this test function
		testSandbox.empty();

		// Record the result of this test if we have permission to send test
		// results back to the BA server at the end
		if (browserAuditSettings.sendresults) {
			testResultsForUpload[this.id] = {
				outcome: result[0],
				reason: result[1],
				duration: duration
			};
		}

		if (browserAuditSettings.displaymode === "full" || browserAuditSettings.displaymode === "summary") {
			// Update the scoreboard based on the test outcome
			browserAuditUI.scoreboard.incrementOutcome(result[0]);
		}

		if (browserAuditSettings.displaymode === "full") {
			// Set the test result, reason for this result, and the execution duration
			thisTest.setResult(result[0], result[1], duration);
		}
	};

	// Execute the test suite
	browserAuditTestFramework.start(callbackFunctions);
})();
