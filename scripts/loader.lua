--[[
  ==============================================================================
  ⚡ NYX9 STUDIO — UNIVERSAL SCRIPT HUB LOADER (Roblox Luau)
  Repository: MatTew-png/wichx-nyx-storefront
  Supported Executors: Delta, Codex, Wave, Solara, Arceus X, Fluxus
  ==============================================================================
]]

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local StarterGui = game:GetService("StarterGui")

local LocalPlayer = Players.LocalPlayer

-- Notification Helper
local function notify(title, text, duration)
    pcall(function()
        StarterGui:SetCore("SendNotification", {
            Title = title or "NYX9 STUDIO",
            Text = text or "Universal Hub Loaded Successfully!",
            Duration = duration or 5
        })
    end)
end

print([[
  _   ___   ____  ______    ______ _______ _    _ _____ _____ ____  
 | \ | \ \ / /\ \/ /___ \  / _____|__   __| |  | |  __ \_   _/ __ \ 
 |  \| |\ V /  \  /  __) | | (___    | |  | |  | | |  | || || |  | |
 | . ` | > <   /  \ |__ <   \___ \   | |  | |  | | |  | || || |  | |
 | |\  |/ . \ / /\ \___) |  ____) |  | |  | |__| | |__| || || |__| |
 |_| \_/_/ \_/_/  \_\____/  |_____/   |_|   \____/|_____/_____\____/ 
]])

print("[NYX9 STUDIO] Initializing Universal Roblox Script Loader...")
notify("NYX9 STUDIO Hub", "Connecting to secure cloud gateway...", 3)

-- Verification & Executor Detection
local executorName = (identifyexecutor and identifyexecutor()) or "Unknown Executor"
print(string.format("[NYX9 STUDIO] Detected Executor: %s", executorName))

task.wait(0.5)
notify("NYX9 STUDIO", string.format("Verified on %s! Welcome %s", executorName, LocalPlayer.Name), 4)

return {
    version = "2026.4.0",
    executor = executorName,
    player = LocalPlayer.Name,
    status = "Active"
}
