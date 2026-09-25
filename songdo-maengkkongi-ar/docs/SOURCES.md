# 자료 출처와 검수 상태

## 동물 형태

- [국립생물자원관 맹꽁이](https://species.nibr.go.kr/resoPath/reso_img_20250829_010359.pdf)
- [국립생물자원관 두꺼비](https://species.nibr.go.kr/resoPath/reso_img_20250605_102214.pdf)
- [국립생물자원관 옴개구리](https://species.nibr.go.kr/resoPath/reso_img_20250829_010523.pdf)
- [맹꽁이 골격 연구](https://doi.org/10.1111/azo.12305): 앞발의 4개 손가락, 뒷발의 5개 발가락 구조 참고.
- [Mo et al., Zootaxa 2013](https://mapress.com/zootaxa/2013/f/z03710p178f.pdf): Kaloula borealis 뒷발의 부분 물갈퀴 비교 설명 참고.
- [게의 자절 후 재생 연구](https://pubmed.ncbi.nlm.nih.gov/28574785/): 재생에는 시간과 비용이 필요함을 반영.

직접 만든 모델의 모든 비율·색·발가락 길이·물갈퀴 범위가 검수되었다는 뜻은 아닙니다. 다른 종의 발에도 단순화한 구조를 사용했으므로 종별 세부 보정이 필요합니다. 세 종 모두 송도 현장에 산다고 주장하지 않습니다. 야생 관찰 안내를 공개하기 전 현지 서식 자료를 확인합니다.

## 울음소리

- 맹꽁이: [Vimeo 40431293](https://vimeo.com/40431293)
- 옴개구리: [Vimeo 40431369](https://vimeo.com/40431369)

국립환경과학원 도감 수록 소리를 소개하는 원본 플레이어를 이용자 클릭 후 연결합니다. 음원 파일을 추출해 배포하지 않습니다. 해당 서비스를 이용할 때 외부 Vimeo에 접속되며 네트워크 상태나 원본 공개 상태에 따라 재생이 달라질 수 있습니다. 사진·영상은 이 플레이어에 전달하지 않습니다.

- 두꺼비: 김용배, 「두꺼비」, [공유마당 원본](https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?menuNo=200020&wrtSn=13253215), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ko).
- 배포 파일 `app/assets/toad-call.wav`는 원본을 변경하지 않았습니다. 제공자가 두꺼비로 분류한 음원이며 종별 소리의 적합성은 교육 공개 전 추가 검수합니다.
- 정답·물총 등의 효과음은 Web Audio로 생성한 연출음입니다. 실제 동물 소리로 사용하지 않습니다.

## 라이브러리와 모델

- Three.js: MIT. `app/vendor/three/LICENSE`.
- MediaPipe Tasks Vision: Apache 2.0. `app/vendor/vision/LICENSE`.
- Pose Landmarker Lite: [Google 공식 모델](https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task), [공식 사용 안내](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js).
- 영상 처리는 기기 내에서 수행합니다. 키·계정·유료 API 없이 로컬 시제품을 실행할 수 있습니다. 공개 운영의 서버 비용까지 무료임을 보장하지는 않습니다.
- `mascot-reference.png`: 선택한 7번을 참고해 이번 제작 과정에서 생성한 이미지. 최종 3D는 이 그림의 몸·표정을 참고하되 발 구조를 보정합니다.
- `songdo-pine-underground-v2.png`: 사용자의 전시 아이디어를 바탕으로 생성한 창작 삽화. 실제 송도솔밭 사진이나 현장 지도 자료로 쓰지 않습니다.
- `experience-qr-pending.svg`: 현재 공개 GitHub Pages 체험 주소를 인코딩한 QR. QR 생성에는 Segno 1.6.6을 사용했고, 독립적인 ZXing 디코더로 주소를 확인했습니다. 파일명의 `pending`은 제작 중 붙인 이름이며 QR 대상 주소는 활성화되어 있습니다.
- 게 GLB: 사용자가 제공한 Meshy 원본을 바탕으로 길이를 변형한 파일. 제3자의 원본을 추가 수집하지 않았습니다.
