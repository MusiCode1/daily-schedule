
$map = @{
    "USER_SELECTOR_TITLE.mp3"         = "who_is_playing.mp3";
    "APP_TITLE_PART1.mp3"             = "app_title_part1.mp3";
    "APP_TITLE_PART2.mp3"             = "app_title_part2.mp3";
    "LOADING_APP.mp3"                 = "loading_app.mp3";
    "PRAISE_ALUF_BOY.mp3"             = "aluf.mp3";
    "PRAISE_ALUF_GIRL.mp3"            = "alufa.mp3";
    "WELL_DONE.mp3"                   = "well_done_all_boy.mp3";
    "ALL_DONE_MESSAGE.mp3"            = "all_done_boy.mp3";
    "DEFAULT_GREETING_WITH_COMMA.mp3" = "good_luck.mp3";
    "TODAY_NO.mp3"                    = "today_no.mp3";
    "FINISHED_PREFIX.mp3"             = "finished_boy.mp3";
    "NOW_PREFIX.mp3"                  = "now_prefix.mp3";
    "CHANGE_LABEL.mp3"                = "change_label.mp3";
    "NOW_LABEL.mp3"                   = "now_label.mp3";
    "DONE_LABEL.mp3"                  = "done_label.mp3";
    "WHO_WILL_BE_WITH_US.mp3"         = "who_will_be_with_us.mp3";
    "COMMUNICATION_BOARD_LABEL.mp3"   = "communication_board_label.mp3";
    "OPEN_COMMUNICATION_BOARD.mp3"    = "open_communication_board.mp3";
    "CLOSE_LABEL.mp3"                 = "close_label.mp3";
    "FLOATING_WINDOW_TITLE.mp3"       = "floating_window_title.mp3";
    "toilet.mp3"                      = "toilet.mp3";
    "breakfast.mp3"                   = "breakfast.mp3";
    "lunch.mp3"                       = "lunch.mp3";
    "dinner.mp3"                      = "dinner.mp3";
    "brushing_teeth.mp3"              = "brushing_teeth.mp3";
    "shower.mp3"                      = "shower.mp3";
    "getting_dressed.mp3"             = "getting_dressed.mp3";
    "going_to_car.mp3"                = "going_to_car.mp3";
    "play_time.mp3"                   = "play_time.mp3";
    "sleep_time.mp3"                  = "sleep_time.mp3";
    "tablet.mp3"                      = "tablet.mp3";
    "lesson.mp3"                      = "lesson.mp3";
    "playground.mp3"                  = "playground.mp3";
    "arts_and_crafts.mp3"             = "arts_and_crafts.mp3";
    "medicine.mp3"                    = "medicine.mp3";
    "grandparents.mp3"                = "grandparents.mp3";
    "prayer.mp3"                      = "prayer.mp3";
    "box_work.mp3"                    = "box_work.mp3";
    "yard.mp3"                        = "yard.mp3";
    "animal_therapy.mp3"              = "animal_therapy.mp3";
    "travel_car.mp3"                  = "travel_car.mp3";
    "visit_building.mp3"              = "visit_building.mp3";
    "guests_arrive.mp3"               = "guests_arrive.mp3";
    "guests_leave.mp3"                = "guests_leave.mp3";
    "back_home.mp3"                   = "back_home.mp3";
    "LIST_MORNING.mp3"                = "list_morning.mp3";
    "GREETING_MORNING.mp3"            = "good_morning.mp3";
    "LIST_AFTERNOON.mp3"              = "list_afternoon.mp3";
    "GREETING_AFTERNOON.mp3"          = "good_afternoon.mp3";
    "LIST_GRANDPARENTS.mp3"           = "list_grandparents.mp3";
    "TITLE_GRANDPARENTS.mp3"          = "title_grandparents.mp3";
    "GREETING_GRANDPARENTS.mp3"       = "greeting_grandparents.mp3";
    "LIST_GUESTS.mp3"                 = "list_guests.mp3";
    "TITLE_GUESTS.mp3"                = "title_guests.mp3";
    "GREETING_GUESTS.mp3"             = "greeting_guests.mp3";
}

$dir = "d:/UserProjects/ThzoharHalev/daily-schedule/resources_playground/eleven-tts/river-v0.2-t2"

# 1. Rename to temp names to avoid collisions/case insensitivity issues
$map.Keys | ForEach-Object {
    $old = $_
    $new = $map[$_]
    $path = Join-Path $dir $old
    if (Test-Path $path) {
        if ($old -ne $new) {
            $temp = $new + ".tmp"
            Rename-Item -Path $path -NewName $temp
            Write-Host "Temp rename $old -> $temp"
        }
    }
}

# 2. Rename temp to final
$map.Keys | ForEach-Object {
    $old = $_
    $new = $map[$_]
    $tempName = $new + ".tmp"
    $tempPath = Join-Path $dir $tempName
    
    if (Test-Path $tempPath) {
        Rename-Item -Path $tempPath -NewName $new
        Write-Host "Final rename $tempName -> $new"
    }
    elseif ($old -eq $new) {
        # Already correct name (case might be issue though?)
        # For simplicity, if equality holds, we assume it's fine unless case rename is needed.
        # Check case sensitivity? Windows is usually case-insensitive.
        # But user requested small letters.
        $path = Join-Path $dir $old
        if (Test-Path $path) {
            # Case rename requires temp
            if ($old -cne $new) {
                $temp = $old + ".case.tmp"
                Rename-Item -Path $path -NewName $temp
                $tempPath = Join-Path $dir $temp
                Rename-Item -Path $tempPath -NewName $new
                Write-Host "Case fix $old -> $new"
            }
        }
    }
}
