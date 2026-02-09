
$dir = "d:/UserProjects/ThzoharHalev/daily-schedule/resources_playground/eleven-tts/hope1-v0.2-t1"

$newNames = @(
    "who_is_playing.mp3",
    "app_title_part1.mp3",
    "app_title_part2.mp3",
    "loading_app.mp3",
    "aluf.mp3",
    "alufa.mp3",
    "well_done_all_boy.mp3",
    "all_done_boy.mp3",
    "good_luck.mp3",
    "today_no.mp3",
    "finished_boy.mp3",
    "now_prefix.mp3",
    "change_label.mp3",
    "now_label.mp3",
    "done_label.mp3",
    "who_will_be_with_us.mp3",
    "communication_board_label.mp3",
    "open_communication_board.mp3",
    "close_label.mp3",
    "floating_window_title.mp3",
    "toilet.mp3",
    "breakfast.mp3",
    "lunch.mp3",
    "dinner.mp3",
    "brushing_teeth.mp3",
    "shower.mp3",
    "getting_dressed.mp3",
    "going_to_car.mp3",
    "play_time.mp3",
    "sleep_time.mp3",
    "tablet.mp3",
    "lesson.mp3",
    "playground.mp3",
    "arts_and_crafts.mp3",
    "medicine.mp3",
    "grandparents.mp3",
    "prayer.mp3",
    "box_work.mp3",
    "yard.mp3",
    "animal_therapy.mp3",
    "travel_car.mp3",
    "visit_building.mp3",
    "guests_arrive.mp3",
    "guests_leave.mp3",
    "back_home.mp3",
    "list_morning.mp3",
    "good_morning.mp3",
    "list_afternoon.mp3",
    "good_afternoon.mp3",
    "list_grandparents.mp3",
    "title_grandparents.mp3",
    "greeting_grandparents.mp3",
    "list_guests.mp3",
    "title_guests.mp3",
    "greeting_guests.mp3"
)

# Files are named 01_Chapter 1.mp3 ... 55_Chapter 1.mp3
# We loop from 1 to 55

for ($i = 0; $i -lt $newNames.Count; $i++) {
    $index = $i + 1
    # Pad index with leading zero if needed
    $prefix = "{0:D2}" -f $index
    $pattern = "${prefix}_Chapter 1.mp3"
    
    $sourcePath = Join-Path $dir $pattern
    $targetName = $newNames[$i]
    $targetPath = Join-Path $dir $targetName
    
    if (Test-Path $sourcePath) {
        Write-Host "Renaming $pattern to $targetName"
        Rename-Item -Path $sourcePath -NewName $targetName
    }
    else {
        Write-Warning "Source file not found: $sourcePath"
    }
}
