# 작업 배경
 - 현재 새롭게 전달받은 nodeList 로직은 roslib.js 가 브라우저의 document.ready 상태에서만 쓸 수 있게 되어있음
 - 웹 페이지에서 뭔가를 만들려면 data 를 fetch 해야하는데 이번 로직의 경우 근사하게 nodejs 를 돌리면서 api 요청으로 받을 수 없음.
 - 그리하여 페이지 진입을 하면서 해당 로직을 수행하여 템플릿에 그리는 방식으로 수정했음.
 - 그러기 위해 webviz 에서 진행하기 전에 빠르고 가볍게 돌리기 위해 별도의 CRA(create-react-app) 를 구성하여 테스트 및 개발을 진행함.

 # 남아있는 문제점
 - 위에서 언급한 방법으로 UI는 구현할 수 있으나 해당 UI를 가지고 데이터를 변경했을 때, 시스템 콘솔에 던지는 방법을 아직 찾지 못했음. (ajax post 같은 요청)
 - 첫번 째 문제를 해결하지 못하면 이 프로젝트 진행 자체에 문제가 생길 수 있음.
 
 # 결과
 - all clear
