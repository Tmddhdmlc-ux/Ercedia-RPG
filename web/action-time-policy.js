// The GM adjudicates elapsed game time; this does not advance or rewind a save.
export const actionTimeInstruction=`[게임 행동 시간]
짧은 답·몇 걸음은 분 미만이면 같은 HH:mm 허용. 턴마다5~10분·요청 없는 대기·휴식 금지. 명시한 기다림·작업·장거리 이동은 실제 소요만 진행하고 game_state.date/time과 scene.time을 맞춥니다.
`;
