#!/usr/bin/env python3
"""รันด้วย Python 3 standard library; ตรวจ C11 ใน temporary directory."""
import argparse
import os
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent
FLAGS = ['-std=c11', '-Wall', '-Wextra', '-pedantic']
TIMEOUT_SECONDS = 3

# main สำหรับทดสอบ: include ไฟล์ของน้อง (ปิด main เดิมด้วย TUTOR_TEST)
# แล้วเรียกแต่ละฟังก์ชันตาม mode ที่ส่งมาทาง argv[1]
HARNESS = r'''
#define TUTOR_TEST
#include "submission.c"

static void print_hero(struct musician hero) {
    printf("%s|%d|%s|%d|%d\n", hero.name, hero.age, hero.instrument,
           hero.sticker.x, hero.sticker.y);
}

int main(int argc, char **argv) {
    if (argc != 2) return 2;
    const char *mode = argv[1];

    struct musician band[] = {
        {"Young",       19, "Violin",   {1, 2}},
        {"Edge",        20, "Keyboard", {3, 4}},
        {"First",       21, "Violin",   {5, 6}},
        {"Last Person", 44, "Keyboard", {7, 8}}
    };
    struct musician ten[10] = {
        {"joy", 12, "", {0, 0}}, {"boy", 20, "", {0, 0}},
        {"jo",  23, "", {0, 0}}, {"pat", 21, "", {0, 0}},
        {"ple", 13, "", {0, 0}}, {"tom", 11, "", {0, 0}},
        {"tu",  25, "", {0, 0}}, {"tee", 34, "", {0, 0}},
        {"bat", 44, "", {0, 0}}, {"phon", 33, "", {0, 0}}
    };
    struct musician hero = {"Original", 18, "Violin", {10, 20}};

    if (!strcmp(mode, "book")) {
        struct book b = make_book();
        printf("%s|%.2f|%.2f|%.2f\n", b.name, b.price, b.discount, b.price - b.discount);
    }
    else if (!strcmp(mode, "mixed"))    show_older(band, 4);
    else if (!strcmp(mode, "none"))     show_older(band, 2);
    else if (!strcmp(mode, "empty"))    show_older(band, 0);
    else if (!strcmp(mode, "one"))      show_older(band + 2, 1);
    else if (!strcmp(mode, "ten"))      show_older(ten, 10);
    else if (!strcmp(mode, "move"))     print_hero(move_right(hero, 5));
    else if (!strcmp(mode, "zero"))     print_hero(move_right(hero, 0));
    else if (!strcmp(mode, "negative")) print_hero(move_right(hero, -3));
    else if (!strcmp(mode, "rename"))   print_hero(rename_to_mint(hero));
    else return 2;
    return 0;
}
'''

# (mode, ชื่อเคส, ผลที่ควรได้) สำหรับ HARNESS
HARNESS_CASES = [
    ('book',     'TODO 1 ชื่อ ราคา และส่วนลด',                'Keyboard Songs|200.00|20.00|180.00\n'),
    ('mixed',    'TODO 2–3 อายุ 19/20/21/44 และชื่อมีช่องว่าง', 'First,21\nLast Person,44\n'),
    ('none',     'TODO 3 ไม่มีคนผ่าน',                       ''),
    ('empty',    'TODO 2 จำนวนคนเป็นศูนย์',                   ''),
    ('one',      'TODO 2 สมาชิกหนึ่งคน',                      'First,21\n'),
    ('ten',      'TODO 2–3 ครบ 10 คนตามสไลด์',                'jo,23\npat,21\ntu,25\ntee,34\nbat,44\nphon,33\n'),
    ('move',     'TODO 4 ขยับขวา เก็บ y และข้อมูลอื่น',          'Original|18|Violin|15|20\n'),
    ('zero',     'TODO 4 ขยับศูนย์',                          'Original|18|Violin|10|20\n'),
    ('negative', 'TODO 4 ใช้ค่า step จริงแม้ติดลบ',              'Original|18|Violin|7|20\n'),
    ('rename',   'TODO 5 เปลี่ยนชื่อ เก็บข้อมูลอื่น',              'Mint|18|Violin|10|20\n'),
]

# (mode, ผลที่ควรได้) สำหรับ main จริงใน practice.c
APP_CASES = [
    ('book',   'Keyboard Songs|200.00|20.00|180.00\n'),
    ('band',   'Fah,23\n'),
    ('move',   'Mali|15|20\n'),
    ('rename', 'Mint|Violin\n'),
]

EXAMPLES = ['book', 'students', 'nested', 'memory']

STUDENTS_INPUT = ''.join(f'{name}\n{age}\n' for name, age in [
    ('joy', 12), ('boy', 20), ('jo', 23), ('pat', 21), ('ple', 13),
    ('tom', 11), ('tu', 25), ('tee', 34), ('bat', 44), ('phon', 33),
])
STUDENTS_PROMPTS = ''.join(f'Student[{i}] name then age: ' for i in range(10))
STUDENTS_EXPECTED = (STUDENTS_PROMPTS
                     + '\nOlder than 20:\njo,23\npat,21\ntu,25\ntee,34\nbat,44\nphon,33\n')

NESTED_EXPECTED = ("King Mongkut's Institute of Technology Ladkrabang\n"
                   "Address: 3 Moo 2, Chalongkrung Rd.\n"
                   "Ladkrabang, Bangkok\n")


class CompileError(Exception):
    pass


def compile_c(compiler, source, binary):
    """คอมไพล์ไฟล์ C ถ้าไม่ผ่านให้พิมพ์ error แล้ว raise CompileError"""
    result = subprocess.run([*compiler, *FLAGS, str(source), '-o', str(binary)],
                            text=True, capture_output=True, timeout=30)
    if result.returncode != 0:
        print('คอมไพล์ไม่ผ่าน:', source.name, '\n', result.stderr)
        raise CompileError(source.name)
    if result.stderr:
        print('Compiler warning:', result.stderr)


class Checker:
    """รันโปรแกรมแล้วเทียบผล นับจำนวนเคสที่ผ่านและไม่ผ่าน"""

    def __init__(self):
        self.passed = 0
        self.failed = 0

    def check(self, label, binary, arguments=(), stdin='', expected=None,
              contains=(), exit_code=0):
        try:
            result = subprocess.run([str(binary), *arguments], input=stdin, text=True,
                                    capture_output=True, timeout=TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired:
            self.failed += 1
            print('FAIL', label, ': เกิน 3 วินาที ดูว่าลูปเพิ่ม i และหยุดได้ไหม')
            return

        ok = (result.returncode == exit_code
              and (expected is None or result.stdout == expected)
              and all(text in result.stdout for text in contains))
        if ok:
            self.passed += 1
            print('PASS', label)
            return

        self.failed += 1
        print('FAIL', label, '\n  ได้:', repr(result.stdout), '\n  exit:', result.returncode)
        if expected is not None:
            print('  ควรได้:', repr(expected))
        if contains:
            print('  ควรมี:', repr(contains))
        if result.stderr:
            print('  stderr:', result.stderr[:500])


def check_functions(checker, compiler, work, source):
    """ทดสอบฟังก์ชัน TODO 1–5 ผ่าน HARNESS"""
    (work / 'submission.c').write_text(source.read_text(encoding='utf-8'), encoding='utf-8')
    (work / 'harness.c').write_text(HARNESS, encoding='utf-8')
    binary = work / 'checks'
    compile_c(compiler, work / 'harness.c', binary)
    for mode, label, expected in HARNESS_CASES:
        checker.check(label, binary, [mode], expected=expected)


def check_app(checker, compiler, work, source):
    """ทดสอบ main จริงของ practice.c"""
    app = work / 'app'
    compile_c(compiler, source, app)
    for mode, expected in APP_CASES:
        checker.check('โปรแกรมจริง ' + mode, app, [mode], expected=expected)


def check_examples(checker, compiler, work):
    """คอมไพล์และทดสอบโปรแกรมใน examples/"""
    for name in EXAMPLES:
        compile_c(compiler, ROOT / 'examples' / f'{name}.c', work / name)

    book = work / 'book'
    checker.check('หนังสือชื่อมีเว้นวรรค', book, stdin='Programming in TurboC\n200\n',
                  contains=['Book: Programming in TurboC\n',
                            'Discount 10 percent: 20.00\n',
                            'Total price: 180.00\n'])
    checker.check('ราคา 350', book, stdin='Violin Basics\n350\n',
                  contains=['Discount 10 percent: 35.00\n', 'Total price: 315.00\n'])
    checker.check('ราคาศูนย์', book, stdin='Free Music\n0\n',
                  contains=['Total price: 0.00\n'])
    checker.check('ราคาไม่ใช่ตัวเลข', book, stdin='Music\noops\n', exit_code=1)

    checker.check('รับนักเรียน 10 คนแล้วกรอง', work / 'students',
                  stdin=STUDENTS_INPUT, expected=STUDENTS_EXPECTED)
    checker.check('มหาวิทยาลัยกับที่อยู่ซ้อน', work / 'nested', expected=NESTED_EXPECTED)

    # ขนาด byte ต่างกันได้ตามเครื่อง จึงตรวจแค่จำนวนคน แล้วพิมพ์ขนาดจริงให้ดู
    memory = work / 'memory'
    checker.check('sizeof จำนวนคน ไม่ล็อก byte ตามเครื่อง', memory,
                  contains=['people=3 ', 'salary_offset='])
    result = subprocess.run([str(memory)], text=True, capture_output=True,
                            timeout=TIMEOUT_SECONDS)
    print('\nขนาดที่วัดบนเครื่องนี้:\n' + result.stdout)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--solution', action='store_true', help='ตรวจโค้ดเฉลย')
    args = parser.parse_args()

    source = ROOT / ('solutions/practice.c' if args.solution else 'practice.c')
    compiler = shlex.split(os.environ.get('CC', 'cc'))
    checker = Checker()

    try:
        with tempfile.TemporaryDirectory(prefix='c-struct-tutor-') as folder:
            work = Path(folder)
            check_functions(checker, compiler, work, source)
            check_app(checker, compiler, work, source)
            check_examples(checker, compiler, work)
    except FileNotFoundError:
        print('ไม่พบ compiler หรือไฟล์ที่ต้องใช้ ตรวจ CC และไฟล์แพ็กเกจ')
        return 2
    except (CompileError, subprocess.TimeoutExpired):
        return 2

    print(f'ผลรวม {checker.passed} ผ่าน / {checker.failed} ไม่ผ่าน')
    if checker.failed:
        print('เริ่มแก้จาก TODO ที่ขึ้น FAIL แล้วลองใหม่ เฉลยอยู่ใน solutions/')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
