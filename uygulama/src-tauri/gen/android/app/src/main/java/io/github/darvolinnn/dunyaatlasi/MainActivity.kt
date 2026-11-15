package io.github.darvolinnn.dunyaatlasi

import android.graphics.Color
import android.os.Bundle
import android.view.View
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Sistem çubukları programın koyu zemininde, açık simgelerle (DEVIR §0.21).
    val zemin = Color.parseColor("#14110D")
    enableEdgeToEdge(SystemBarStyle.dark(zemin), SystemBarStyle.dark(zemin))
    super.onCreate(savedInstanceState)
    window.decorView.setBackgroundColor(zemin)
    // Sayfa saat/pil çubuğunun, alttaki gezinme çubuğunun ve ekran klavyesinin altına girmesin: o kadar boşluk bırakılır.
    // Klavye açılınca sayfa küçülür; yazılan satır klavyenin arkasında kalmaz.
    val kok = findViewById<View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(kok) { v, ic ->
      val b = ic.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime())
      v.setPadding(b.left, b.top, b.right, b.bottom)
      WindowInsetsCompat.CONSUMED
    }
  }
}
