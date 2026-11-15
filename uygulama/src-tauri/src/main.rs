// Windows uygulamasının giriş noktası; programın kendisi `lib.rs`'tedir (Android de onu kullanır).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    dunya_atlasi_lib::run()
}
