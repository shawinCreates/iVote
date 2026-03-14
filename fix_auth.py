from pathlib import Path
import re

p = Path(r'd:\iVote\backend\app\routers\auth.py')
text = p.read_text()

# Fix the last "return UserResponse" block (get_me)
pattern = r"(return UserResponse\(\n)([\s\S]*?)\n\)\s*$"
matches = list(re.finditer(pattern, text, re.MULTILINE))
if not matches:
    raise SystemExit('No match for get_me return block')

start, end = matches[-1].span()

new_block = (
    "return UserResponse(\n"
    "        id=current_user.id,\n"
    "        created_at=current_user.created_at,\n"
    "        email=current_user.email,\n"
    "        full_name=student.full_name,\n"
    "        tu_registration_number=student.tu_registration_number,\n"
    "        faculty=student.faculty,\n"
    "        program=student.program,\n"
    "        year_or_sem=student.year_or_sem,\n"
    "        role=current_user.role.value,\n"
    "        is_verified=current_user.is_verified\n"
    "    )\n"
)

text = text[:start] + new_block + text[end:]
p.write_text(text)
print('patched get_me return block')
