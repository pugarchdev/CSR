import sys
import subprocess
import json

try:
    subprocess.run([
        r"C:\Python314\python.exe",
        "-m",
        "code_review_graph",
        "update",
        "--skip-flows",
        "--repo",
        r"D:\MahaCSR\CSR"
    ], capture_output=True, timeout=30)
except Exception:
    pass

# Contract: PostToolUse expects empty JSON object on stdout
print(json.dumps({}))
sys.stdout.flush()
