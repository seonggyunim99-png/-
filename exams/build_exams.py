"""모의고사 원고(exam*.txt)를 읽어 검사하고 JSON으로 바꿔요.

사용법: python3 exams/build_exams.py  →  exams/exams.json
검사: 회차별 100문항, 선택지 4~5개, 정답 번호 범위, 선택지 중복, 빈 해설
선택지 순서가 의미 없는 문제는 정답 번호가 고르게 퍼지도록 섞어요 (고정 시드).
"""
import json, os, random, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = {
    1: ('1회 기초', '거의 모든 유형을 다루는 기본 문제', ['exam1a.txt', 'exam1b.txt']),
    2: ('2회 최상위', '모두 고르기·개수 세기·지도서 세부까지 묻는 최고 난도', ['exam2a.txt', 'exam2b.txt']),
    3: ('3회 어법', '★ 배열·밑줄 쓰임·문장 전환·오류 수정 중심', ['exam3a.txt', 'exam3b.txt']),
    4: ('4회 문화', '교과서 문화 쪽·지도서·수업 필기에서 낸 일본 문화 문제', ['exam4a.txt', 'exam4b.txt']),
}
PARTS, PER = 5, 20  # 20문제씩 5부로 나눠 풀기

def parse(path):
    qs, sec, cur = [], '', None
    for raw in open(path, encoding='utf-8'):
        line = raw.rstrip('\n')
        if line.startswith('#') or not line.strip():
            continue
        if line.startswith('@ '):
            sec = line[2:].strip(); continue
        m = re.match(r'^(Q|B|A|E):\s?(.*)$', line)
        o = re.match(r'^([1-5])\)\s?(.*)$', line)
        if m and m.group(1) == 'Q':
            cur = {'s': sec, 'q': m.group(2), 'o': []}; qs.append(cur)
        elif m and m.group(1) == 'B':
            cur['b'] = m.group(2).replace(' | ', '\n').replace('|', '\n')
        elif m and m.group(1) == 'A':
            cur['a'] = int(m.group(2))
        elif m and m.group(1) == 'E':
            cur['e'] = m.group(2)
        elif o:
            assert int(o.group(1)) == len(cur['o']) + 1, (path, cur['q'], '선택지 번호 순서')
            cur['o'].append(o.group(2))
        else:
            raise SystemExit(f'{path}: 알 수 없는 줄 → {line}')
    return qs

# 선택지 순서가 의미를 갖는 문제(개수, 번호, ㄱㄴ 조합, 순서 배열)는 섞지 않음
FIXED = re.compile(r'^(\d+개|[①-⑤]|\(가\)|\(나\)|\(다\)|\(라\)|[ㄱ-ㅎ](,|$))')
def shuffle_ok(q):
    return not any(FIXED.match(o) for o in q['o'])

def split_parts(qs):
    """영역이 고르게 섞이도록 20문제씩 5부로 나누고, 부마다 정답 번호도 고르게 맞춰요."""
    part = [j % PARTS for j in range(len(qs))]  # 영역 순서대로 돌아가며 나눠 담기
    def cost():
        c = 0
        for p in range(PARTS):
            cnt = [sum(1 for j, q in enumerate(qs) if part[j] == p and q['a'] == k) for k in range(1, 5)]
            c += max(cnt) - min(cnt)
        return c
    best = cost(); improved = True
    while improved:
        improved = False
        for i in range(len(qs)):
            for j in range(i + 1, len(qs)):
                if qs[i]['s'] != qs[j]['s'] or part[i] == part[j] or qs[i]['a'] == qs[j]['a']:
                    continue
                part[i], part[j] = part[j], part[i]
                c = cost()
                if c < best: best = c; improved = True
                else: part[i], part[j] = part[j], part[i]
    out = []
    for p in range(PARTS):
        out += [q for j, q in enumerate(qs) if part[j] == p]
    for p in range(PARTS):
        chunk = out[p * PER:(p + 1) * PER]
        assert len(chunk) == PER
        dist = {k: sum(1 for q in chunk if q['a'] == k) for k in range(1, 6) if any(q['a'] == k for q in chunk)}
        print(f'   {p + 1}부: 정답 {dist}, 영역 {len(set(q["s"] for q in chunk))}개')
    return out

def main():
    out, problems = {}, []
    for n, (title, desc, files) in SETS.items():
        qs = []
        for f in files:
            p = os.path.join(HERE, f)
            if os.path.exists(p):
                qs += parse(p)
        for i, q in enumerate(qs, 1):
            tag = f'{n}회 {i}번'
            if not (4 <= len(q['o']) <= 5): problems.append(f'{tag}: 선택지 {len(q["o"])}개')
            if 'a' not in q or not (1 <= q['a'] <= len(q['o'])): problems.append(f'{tag}: 정답 번호 오류')
            if len(set(q['o'])) != len(q['o']): problems.append(f'{tag}: 선택지 중복')
            if not q.get('e'): problems.append(f'{tag}: 해설 없음')
        if problems:
            continue
        # 정답 번호가 1~4번에 고르게 퍼지는 시드를 고름
        def arrange(seed):
            rng = random.Random(seed)
            res = []
            for q in qs:
                q2 = dict(q, o=list(q['o']))
                if shuffle_ok(q2):
                    right = q2['o'][q2['a'] - 1]
                    rng.shuffle(q2['o'])
                    q2['a'] = q2['o'].index(right) + 1
                res.append(q2)
            c = [sum(1 for q in res if q['a'] == k) for k in range(1, 5)]
            return max(c) - min(c), res
        best = min((arrange(1000 * n + s) for s in range(400)), key=lambda x: x[0])
        qs = best[1]
        for i, q in enumerate(qs):
            q['id'] = i  # 원고 순서 번호: 저장된 답이 이 번호를 기준으로 남아요
        qs = split_parts(qs)
        if len(qs) != 100: problems.append(f'{n}회: {len(qs)}문항 (100문항이어야 함)')
        dist = {k: sum(1 for q in qs if q.get('a') == k) for k in range(1, 6)}
        print(f'{n}회 {title}: {len(qs)}문항, 정답 분포 {dist}, 영역 {sorted(set(q["s"] for q in qs), key=[q["s"] for q in qs].index)}')
        out[n] = {'title': title, 'desc': desc, 'qs': qs}
    if problems:
        print('문제 발견:'); print('\n'.join(problems)); sys.exit(1)
    json.dump(out, open(os.path.join(HERE, 'exams.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('OK → exams/exams.json')

main()
