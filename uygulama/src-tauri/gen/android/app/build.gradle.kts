import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

// İmza anahtarı (DEVIR §0.21): depoda değil. GitHub'da gizli değerlerden, bu bilgisayarda `keystore.properties`'ten gelir.
// Her sürüm aynı anahtarla imzalanmalı; yoksa tablet güncellemeyi kabul etmez ve uygulama silinip kurulmak zorunda kalır.
val imzaAyari = Properties().apply {
    val dosya = rootProject.file("keystore.properties")
    if (dosya.exists()) {
        dosya.inputStream().use { load(it) }
    }
}

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

android {
    compileSdk = 37
    namespace = "io.github.darvolinnn.dunyaatlasi"
    defaultConfig {
        manifestPlaceholders["usesCleartextTraffic"] = "false"
        applicationId = "io.github.darvolinnn.dunyaatlasi"
        minSdk = 24
        targetSdk = 37
        versionCode = tauriProperties.getProperty("tauri.android.versionCode", "1").toInt()
        versionName = tauriProperties.getProperty("tauri.android.versionName", "1.0")
    }
    signingConfigs {
        if (imzaAyari.getProperty("storeFile") != null) {
            create("release") {
                storeFile = rootProject.file(imzaAyari.getProperty("storeFile"))
                storePassword = imzaAyari.getProperty("password")
                keyAlias = imzaAyari.getProperty("keyAlias")
                keyPassword = imzaAyari.getProperty("password")
            }
        }
    }
    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            // Hata ayıklama bilgisi APK'ya konmaz: onunla deneme APK'sı ~175 MB oluyor, kullanıcının bağlantısında indirmesi uzun sürüyor.
        }
        getByName("release") {
            signingConfigs.findByName("release")?.let { signingConfig = it }
            optimization {
               enable = true
            }
            proguardFiles(
                *fileTree(".") {
                  include("**/*.pro")
                  exclude("build/**")
                }.files.toTypedArray()
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    buildFeatures {
        buildConfig = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget = JvmTarget.JVM_1_8
    }
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.lifecycle:lifecycle-process:2.10.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")
}

apply(from = file("tauri.build.gradle.kts"))
