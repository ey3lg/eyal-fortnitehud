local isLoggedIn = false
local inputTimer = nil
local my_webui = WebUI('Eyal_FortniteHUD', 'Eyal_FortniteHUD/html/index.html')
local player_data = {}
local playerPawn = nil
local health = 100
local prevHealth = 100
local prevArmor = 0
local playerDead = false
local round = math.floor
local metadata = {}

local function updateMetadataCache()
    if player_data.metadata then
        metadata.armor = player_data.metadata['armor'] or 0
    end
end

function onShutdown()
    if inputTimer then
        Timer.ClearInterval(inputTimer)
        inputTimer = nil
    end
    if my_webui then
        my_webui:Destroy()
        my_webui = nil
    end
end

local function disableDefaultHUD()
    local actors = UE.TArray(UE.AActor)
    UE.UGameplayStatics.GetAllActorsWithTag(HWorld, 'HWebUI', actors)
    if actors[1] then
        actors[1]:SetHUDVisibility(false, false, true, true, false)
    end
end

RegisterClientEvent('QBCore:Client:OnPlayerLoaded', function()
    isLoggedIn = true
    disableDefaultHUD()
    player_data = exports['qb-core']:GetPlayerData()
    updateMetadataCache()
end)

RegisterClientEvent('QBCore:Client:OnPlayerUnload', function()
    isLoggedIn = false
    playerPawn = nil
    player_data = {}
    metadata = {}
end)

RegisterClientEvent('QBCore:Player:SetPlayerData', function(val)
    player_data = val
    updateMetadataCache()
end)



RegisterClientEvent('HEvent:HealthChanged', function(_, newHealth)
    if my_webui then
        local damage = health > newHealth and health - newHealth or 0
        health = newHealth
        if newHealth > 0 and playerDead then playerDead = false end
        if damage > 0 then
            my_webui:SendEvent('updateHealth', { health = health, damage = damage })
        else
            my_webui:SendEvent('updateHealth', { health = health })
        end
        prevHealth = health
    end
end)

RegisterClientEvent('HEvent:Death', function()
    playerDead = true
end)

RegisterClientEvent('HEvent:PlayerPossessed', function()
    playerPawn = HPlayer and HPlayer:K2_GetPawn() or UE.UGameplayStatics.GetPlayerController(HWorld, 0):K2_GetPawn()
    if not HPlayer then
        HPlayer = UE.UGameplayStatics.GetPlayerController(HWorld, 0)
    end
end)

RegisterClientEvent('HEvent:PlayerUnPossessed', function()
    playerPawn = nil
end)



inputTimer = Timer.SetInterval(function()
    if isLoggedIn and playerPawn and my_webui then
        local currentArmor = metadata.armor
        local armorDamage = prevArmor > currentArmor and prevArmor - currentArmor or 0

        if armorDamage > 0 then
            my_webui:SendEvent('updateArmor', { armor = currentArmor, damage = armorDamage })
        else
            my_webui:SendEvent('updateArmor', { armor = currentArmor })
        end

        my_webui:SendEvent('UpdateHUD', {
            health = health,
            armor = currentArmor
        })

        prevArmor = currentArmor
    end
end, 250)
