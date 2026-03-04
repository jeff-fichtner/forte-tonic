-- Maintenance Mode Toggle for Tonic
-- Double-click this app to toggle maintenance mode via native macOS dialogs.
-- Calls toggle-maintenance.sh (must be in the same directory as this app).

on run
	try
		-- Resolve path to toggle-maintenance.sh relative to this app
		set scriptDir to do shell script "dirname " & quoted form of POSIX path of (path to me)
		set toggleScript to scriptDir & "/toggle-maintenance.sh"

		-- Verify the script exists
		try
			do shell script "test -x " & quoted form of toggleScript
		on error
			display alert "Script Not Found" message "Could not find toggle-maintenance.sh next to this app." & return & return & "Expected: " & toggleScript as critical
			return
		end try

		-- Verify gcloud is installed
		try
			do shell script "export PATH=\"/usr/local/bin:/opt/homebrew/bin:/usr/bin:$PATH\" && command -v gcloud"
		on error
			display alert "gcloud Not Found" message "The Google Cloud CLI (gcloud) is not installed." & return & return & "Install it from: https://cloud.google.com/sdk/docs/install" as critical
			return
		end try

		-- Step 1: Choose environment
		set envChoice to button returned of (display dialog "Which environment?" buttons {"Cancel", "Staging", "Production"} default button "Staging" with title "Maintenance Mode" with icon caution)
		set envArg to "staging"
		if envChoice is "Production" then
			set envArg to "production"
		end if

		-- Step 2: Choose action
		set actionChoice to button returned of (display dialog "Turn maintenance mode ON or OFF for " & envChoice & "?" buttons {"Cancel", "OFF", "ON"} default button "ON" with title "Maintenance Mode" with icon caution)
		set modeArg to "on"
		if actionChoice is "OFF" then
			set modeArg to "off"
		end if

		-- Step 3: Custom message (only when turning ON)
		set customMessage to ""
		if modeArg is "on" then
			set msgResult to display dialog "Enter a custom maintenance message:" & return & "(Leave blank to use the default message)" default answer "" buttons {"Cancel", "Use Default", "Use Custom Message"} default button "Use Default" with title "Maintenance Message"
			if button returned of msgResult is "Use Custom Message" then
				set customMessage to text returned of msgResult
				if customMessage is "" then
					set customMessage to ""
				end if
			end if
		end if

		-- Step 4: Summary & confirmation
		set summary to "Environment:  " & envChoice & return & "Action:  Turn maintenance " & actionChoice
		if modeArg is "on" and customMessage is not "" then
			set summary to summary & return & "Message:  " & customMessage
		else if modeArg is "on" then
			set summary to summary & return & "Message:  (default)"
		end if

		set confirmTitle to "Confirm"
		set confirmIcon to caution
		if envArg is "production" then
			set summary to "WARNING: You are modifying PRODUCTION!" & return & return & summary
			set confirmTitle to "PRODUCTION - Confirm"
		end if

		set confirmResult to button returned of (display dialog summary buttons {"Cancel", "Proceed"} default button "Cancel" with title confirmTitle with icon confirmIcon)
		if confirmResult is not "Proceed" then
			return
		end if

		-- Step 5: Execute
		set shellCmd to "export PATH=\"/usr/local/bin:/opt/homebrew/bin:/usr/bin:$PATH\" && " & quoted form of toggleScript & " " & envArg & " " & modeArg
		if customMessage is not "" then
			set shellCmd to shellCmd & " " & quoted form of customMessage
		end if
		set shellCmd to shellCmd & " --no-confirm"

		display dialog "Updating " & envChoice & "..." & return & "This may take a minute." buttons {"OK"} default button "OK" giving up after 2 with title "Working..."

		set shellOutput to do shell script shellCmd

		-- Step 6: Success
		display alert "Maintenance mode is now " & actionChoice message "Environment: " & envChoice & return & return & "Script output:" & return & shellOutput as informational

	on error errMsg number errNum
		if errNum is -128 then
			-- User cancelled — do nothing
			return
		end if
		display alert "Error" message errMsg as critical
	end try
end run
