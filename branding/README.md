# GearGrid Brand Pack

[Download the complete ZIP](GearGrid-Brand-Pack.zip). Editable SVG masters are in [source](source/).

Approved design 02, Twin G. Primary colors are midnight navy `#0B1938`, orange `#F55B00`, and white.

| Platform | Assets | Integration |
| --- | --- | --- |
| Logo | Light and dark lockups, standalone mark and app icon in SVG and PNG | Use the dark-background lockup on navy surfaces. |
| iOS | 1024 px opaque PNG and AppIcon asset catalog | Copy the AppIcon.appiconset folder into the Xcode asset catalog before archiving the IPA. |
| Android | Legacy density PNGs, adaptive vectors, themed monochrome and 512 px store artwork | The Android app in this repository already references the included launcher resources. |
| macOS | ICNS and iconset PNGs | Configure the app bundle icon before building the DMG. |
| Windows | Multi-size ICO | Set it as the application icon in the EXE build configuration. |
| Linux | Hicolor PNG sizes and scalable SVG | Install under the listed paths in the DEB and set Icon=geargrid in the desktop entry. |
| Web | SVG and ICO favicons, 32 px PNG, 180 px touch icon, 192 px and 512 px PNGs | Storefront and admin pages reference the favicon assets. |

This pack contains branding assets and asset catalog files. Build the IPA, APK, DMG, EXE, and DEB with their respective app projects and signing configuration.
