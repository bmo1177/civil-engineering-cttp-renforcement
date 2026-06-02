# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['inference_server.py'],
    pathex=[],
    binaries=[],
    datas=[('road_condition_model_finetuned.keras', '.'), ('Yolo-Road-Condition-main/yolo_road_model.pt', 'Yolo-Road-Condition-main'), ('class_names.txt', '.')],
    hiddenimports=['tensorflow', 'ultralytics', 'PIL', 'numpy'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='inference-server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
