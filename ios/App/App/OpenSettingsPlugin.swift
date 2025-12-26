import Foundation
import Capacitor
import UIKit

/**
 * Native iOS Plugin to Open App Settings
 *
 * This plugin provides a reliable way to open the iOS Settings app
 * directly to this app's notification settings page.
 *
 * The UIApplication.openSettingsURLString constant provides the correct
 * deep link that iOS recognizes and respects.
 */
@objc(OpenSettingsPlugin)
public class OpenSettingsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "OpenSettingsPlugin"
    public let jsName = "OpenSettings"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise)
    ]

    /**
     * Opens the iOS Settings app to this app's page
     * Returns success/failure via Promise
     */
    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            // UIApplication.openSettingsURLString is the official way to open app settings
            // This opens directly to: Settings > [Your App Name]
            guard let settingsUrl = URL(string: UIApplication.openSettingsURLString) else {
                call.reject("Failed to create settings URL")
                return
            }

            // Check if we can open the URL (should always be true for settings)
            guard UIApplication.shared.canOpenURL(settingsUrl) else {
                call.reject("Cannot open settings URL")
                return
            }

            // Open the settings page
            UIApplication.shared.open(settingsUrl, options: [:]) { success in
                if success {
                    call.resolve(["success": true])
                } else {
                    call.reject("Failed to open settings")
                }
            }
        }
    }
}
