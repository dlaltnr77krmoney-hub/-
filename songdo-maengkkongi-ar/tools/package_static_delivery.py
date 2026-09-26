"""Build the standalone static website ZIP for the exhibition instructor."""
from datetime import datetime
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT / "app"
RELEASES = PROJECT / "releases"
STAMP = datetime.now().strftime("%Y%m%d")
ARCHIVE = RELEASES / f"송도_맹꽁이_AR_강사님전달_웹배포_{STAMP}.zip"
STATIC_MODE = "const staticSite=location.hostname.endsWith('.github.io');"


def main():
    RELEASES.mkdir(exist_ok=True)
    files = sorted(path for path in SOURCE.rglob("*") if path.is_file())
    if not files:
        raise RuntimeError("app/ 폴더에 배포할 파일이 없습니다.")

    guide = """송도 맹꽁이 AR · 강사님께 드리는 웹배포 안내
상상아트 | 기획·제작 이미숙

1. web 폴더 안의 파일과 하위 폴더를 모두 공개 웹 디렉터리에 올려 주세요.
   index.html, app.mjs, assets, vendor 등이 같은 상대 위치를 유지해야 합니다.
2. 휴대폰 카메라 기능은 HTTPS 주소에서 열어야 합니다. 방문자는 카메라 권한을 허용해야 합니다.
3. 이 ZIP은 정적 웹사이트용입니다. 관찰 3종, 4문제, 오답 재도전, 손바닥 터치 셀카·사진 저장을 이용할 수 있습니다.
   공통 순위는 포함되지 않습니다. 여러 방문자의 순위를 공유하려면 별도 서버와 저장소가 필요합니다.
4. 동물 울음 원본 영상은 외부 Vimeo에 연결하므로 인터넷 접속이 필요합니다.
5. 기존 전시 포스터·QR은 이전 GitHub Pages 주소를 가리킵니다. 새 서버 주소를 쓰려면 QR을 새로 만들어야 합니다.
6. 이 시제품에는 이미지 마커 인식이나 실제 동물 자동 인식 기능이 없습니다.
7. 맹꽁이 3D는 형태 시제품입니다. 실제 휴대폰 현장 성능과 생태 표현은 전시 전 확인해 주세요.

웹 루트에 설치했다면 방문 주소는 https://새도메인/ 입니다.
web 폴더째 올렸다면 방문 주소는 https://새도메인/web/ 입니다.
압축을 풀기 전 ZIP 파일만 서버에 올리면 체험이 실행되지 않습니다.
"""

    with ZipFile(ARCHIVE, "w", compression=ZIP_DEFLATED, compresslevel=6) as package:
        package.writestr("강사님께_배포안내.txt", guide.encode("utf-8-sig"))
        for path in files:
            relative = path.relative_to(SOURCE).as_posix()
            data = path.read_bytes()
            if relative == "app.mjs":
                code = data.decode("utf-8")
                if code.count(STATIC_MODE) != 1:
                    raise RuntimeError("연습 모드 설정 위치가 바뀌었습니다. 패키지를 검토해 주세요.")
                data = code.replace(STATIC_MODE, "const staticSite=true;").encode("utf-8")
            package.writestr(f"web/{relative}", data)

    with ZipFile(ARCHIVE) as package:
        bad = package.testzip()
        if bad:
            raise RuntimeError(f"압축 파일 검사 실패: {bad}")
        if "web/index.html" not in package.namelist() or "web/assets/crab.glb" not in package.namelist():
            raise RuntimeError("필수 배포 파일이 ZIP에 없습니다.")
    print(f"{ARCHIVE}\n파일 {len(files)}개 + 안내문, {ARCHIVE.stat().st_size / (1024 * 1024):.1f} MiB")


if __name__ == "__main__":
    main()
