"""exams.json과 모의고사 화면 코드를 index.html에 넣어요. 여러 번 실행해도 됩니다.

사용법: python3 exams/build_exams.py && python3 exams/embed.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(HERE, '..', 'index.html')
s = open(INDEX, encoding='utf-8').read()

def put(start, end, content, anchor):
    """start~end 표시 사이를 content로 바꾸고, 표시가 없으면 anchor 바로 앞에 새로 넣음"""
    global s
    block = f'{start}\n{content}\n{end}'
    if start in s:
        a = s.index(start); b = s.index(end, a) + len(end)
        s = s[:a] + block + s[b:]
    else:
        assert s.count(anchor) == 1, anchor
        s = s.replace(anchor, block + '\n' + anchor)

css = open(os.path.join(HERE, 'exam_ui.css'), encoding='utf-8').read().rstrip()
put('    /* EXAM-CSS-START */', '    /* EXAM-CSS-END */', css, '    .toast {')

data = json.load(open(os.path.join(HERE, 'exams.json'), encoding='utf-8'))
js = 'const EXAMS = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n' + open(os.path.join(HERE, 'exam_ui.js'), encoding='utf-8').read().rstrip()
put('/* EXAM-JS-START */', '/* EXAM-JS-END */', js, '/* ============================================================\n   10. 공통')

nav = '    <button class="nav-item" data-tab="exam"><i>📝</i>모의고사</button>\n'
if 'data-tab="exam"' not in s:
    anchor = '    <button class="nav-item" data-tab="grammar">'
    assert s.count(anchor) == 1
    s = s.replace(anchor, nav + anchor)

section = '''  <!-- 모의고사 -->
  <section class="view" id="view-exam">
    <div class="toolbar">
      <div class="seg" id="examSeg">
        <button data-v="1">1회 기초</button>
        <button data-v="2">2회 최상위</button>
        <button data-v="3">3회 어법</button>
        <button data-v="4">4회 문화</button>
      </div>
    </div>
    <div id="examArea"></div>
  </section>

'''
if 'id="view-exam"' not in s:
    anchor = '  <!-- 개념 -->'
    assert s.count(anchor) == 1
    s = s.replace(anchor, section + anchor)

hook = "  else if (activeTab === 'exam') renderExam();\n"
if hook not in s:
    anchor = "  else if (activeTab === 'list') renderList();\n"
    assert s.count(anchor) == 1
    s = s.replace(anchor, anchor + hook)

seg = "bindSeg('#examSeg', 'examSet', renderExam);"
if seg not in s:
    anchor = "bindSeg('#quizModeSeg', 'quizMode', startQuiz);"
    assert s.count(anchor) == 1
    s = s.replace(anchor, anchor + '\n' + seg)

if "examSet: '1'" not in s:
    anchor = "story: '3', hideKr: false, hideJp: false };"
    assert s.count(anchor) == 1
    s = s.replace(anchor, "story: '3', hideKr: false, hideJp: false, examSet: '1', exam: {} };")

open(INDEX, 'w', encoding='utf-8').write(s)
print('embedded:', {k: len(v['qs']) for k, v in data.items()})
