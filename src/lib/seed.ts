import { uid } from "./ids";
import { vnToday } from "./dates";
import { defaultRecurrenceSchedule } from "./schedules";
import type {
  AppState,
  LibraryDoc,
  SkillItem,
  SkillNode,
  Subject,
  SubjectSchedule,
} from "./types";

function gChordSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 250">
    <rect width="220" height="250" fill="#fff"/>
    <text x="110" y="28" text-anchor="middle" font-family="Be Vietnam Pro, sans-serif" font-size="22" font-weight="700" fill="#1A1814">G</text>
    <g transform="translate(40,48)" fill="none" stroke="#1A1814" stroke-width="2">
      <rect x="0" y="20" width="140" height="140"/>
      <path d="M0,20 h140" stroke-width="6"/>
      <path d="M0,55 h140 M0,90 h140 M0,125 h140 M0,160 h140"/>
      <path d="M28,20 v140 M56,20 v140 M84,20 v140 M112,20 v140"/>
    </g>
    <g fill="#1A1814" font-family="Be Vietnam Pro, sans-serif" font-size="13" text-anchor="middle">
      <circle cx="40" cy="58" r="8" fill="none" stroke="#1A1814" stroke-width="2"/>
      <text x="40" y="54">×</text>
      <text x="68" y="54">○</text>
      <circle cx="96" cy="121" r="11"/>
      <text x="96" y="126" fill="#F7F4EE" font-size="11">2</text>
      <circle cx="124" cy="156" r="11"/>
      <text x="124" y="161" fill="#F7F4EE" font-size="11">1</text>
      <circle cx="152" cy="156" r="11"/>
      <text x="152" y="161" fill="#F7F4EE" font-size="11">3</text>
      <circle cx="180" cy="156" r="11"/>
      <text x="180" y="161" fill="#F7F4EE" font-size="11">4</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createSeedState(now = new Date()): AppState {
  const today = vnToday(now);
  const guitar: Subject = {
    id: "sub_guitar",
    name: "Guitar",
    accent: "green",
    icon: "guitar",
    createdAt: 1,
  };
  const code: Subject = {
    id: "sub_code",
    name: "Lập trình",
    accent: "orange",
    icon: "code",
    createdAt: 2,
  };

  const gNodes: SkillNode[] = [
    { id: "node_g1", subjectId: guitar.id, title: "Cầm đàn", order: 0 },
    { id: "node_g2", subjectId: guitar.id, title: "Hợp âm C", order: 1 },
    { id: "node_g3", subjectId: guitar.id, title: "Hợp âm G", order: 2 },
    { id: "node_g4", subjectId: guitar.id, title: "Chuyển C–G", order: 3 },
    { id: "node_g5", subjectId: guitar.id, title: "Đệm một bài", order: 4 },
  ];
  const cNodes: SkillNode[] = [
    { id: "node_c1", subjectId: code.id, title: "Hàm và biến", order: 0 },
    { id: "node_c2", subjectId: code.id, title: "Cấu trúc điều kiện", order: 1 },
    { id: "node_c3", subjectId: code.id, title: "Vòng lặp", order: 2 },
  ];

  const done = (partial: Omit<SkillItem, "status">): SkillItem => ({
    ...partial,
    status: "done",
    completedAt: today,
    reviewDue: null,
  });
  const todo = (partial: Omit<SkillItem, "status">): SkillItem => ({
    ...partial,
    status: "todo",
  });

  const items: SkillItem[] = [
    done({
      id: "item_g1a",
      nodeId: "node_g1",
      title: "Tư thế ngồi",
      notes: "Lưng thẳng, đàn tựa đùi phải, cần đàn nghiêng lên.",
    }),
    done({
      id: "item_g1b",
      nodeId: "node_g1",
      title: "Cầm cần đàn",
      notes: "Ngón cái sau cần, không kẹp đàn bằng lòng bàn tay.",
    }),
    done({
      id: "item_g2a",
      nodeId: "node_g2",
      title: "Đặt ngón C",
      notes: "Ngón 1 ngăn 1 dây 2, ngón 2 ngăn 2 dây 4, ngón 3 ngăn 3 dây 5.",
    }),
    done({
      id: "item_g2b",
      nodeId: "node_g2",
      title: "Bấm sạch tiếng",
      notes: "Bấm sát ngăn, nghe từng dây — không bị nghẹt.",
    }),
    done({
      id: "item_g3a",
      nodeId: "node_g3",
      title: "Đặt ngón đúng",
    }),
    done({
      id: "item_g3b",
      nodeId: "node_g3",
      title: "Giữ thế tay ổn định",
    }),
    todo({
      id: "item_g3c",
      nodeId: "node_g3",
      title: "Gảy đều hợp âm G",
      notes:
        "- Bấm G: ngón 1 ngăn 2 dây 5, ngón 2 ngăn 3 dây 6, ngón 3 ngăn 3 dây 1, ngón 4 ngăn 3 dây 2.\n- Đánh đều xuống 4 nhịp, giữ nhịp 4/4.",
      attachmentId: "doc_g_chord",
      reviewDue: today,
    }),
    todo({
      id: "item_g3d",
      nodeId: "node_g3",
      title: "Chuyển từ C",
      notes: "Từ thế C, nhấc và đặt cả bàn tay sang G, không nhìn cần đàn.",
    }),
    todo({
      id: "item_g3e",
      nodeId: "node_g3",
      title: "Bài tập nhịp đều",
      notes: "Gảy bốn nhịp xuống, nghỉ một nhịp, lặp lại đến khi tay không căng.",
    }),
    todo({
      id: "item_g4a",
      nodeId: "node_g4",
      title: "Đổi hợp âm đều",
      notes: "C rồi G, mỗi hợp âm bốn nhịp, không dừng tay gảy.",
    }),
    todo({
      id: "item_g5a",
      nodeId: "node_g5",
      title: "Đệm vòng C–G",
      notes: "Chọn một giai điệu ngắn và chỉ đệm C với G.",
    }),
    done({
      id: "item_c1a",
      nodeId: "node_c1",
      title: "Khai báo biến",
      notes: "Đặt tên rõ, gán giá trị, in ra để kiểm tra.",
    }),
    todo({
      id: "item_c1b",
      nodeId: "node_c1",
      title: "Viết hàm nhận tham số",
      notes: "Viết một hàm nhận tên và trả lời chào. Gọi hàm với hai giá trị khác nhau.",
    }),
    todo({
      id: "item_c1c",
      nodeId: "node_c1",
      title: "Hàm trả về kết quả",
      notes: "Hàm tính tổng hai số và dùng giá trị trả về, không chỉ in trong hàm.",
    }),
    todo({
      id: "item_c2a",
      nodeId: "node_c2",
      title: "If / else",
      notes: "Nhánh đúng và nhánh còn lại, mỗi nhánh làm một việc rõ.",
    }),
    todo({
      id: "item_c3a",
      nodeId: "node_c3",
      title: "For và while",
      notes: "Lặp một danh sách bằng for, lặp đến khi đủ điều kiện bằng while.",
    }),
  ];

  const library: LibraryDoc[] = [
    {
      id: "doc_g_chord",
      type: "image",
      title: "Sơ đồ hợp âm G",
      url: gChordSvg(),
      mimeType: "image/svg+xml",
      subjectId: guitar.id,
      nodeId: "node_g3",
      itemId: "item_g3c",
      createdAt: 1,
    },
    {
      id: "doc_g_note",
      type: "note",
      title: "Ghi chú gảy đều",
      text: "Giữ cổ tay lỏng. Đừng nhìn tay trái khi đã nhớ thế G.",
      subjectId: guitar.id,
      nodeId: "node_g3",
      createdAt: 2,
    },
  ];

  const schedules: Record<string, SubjectSchedule> = {
    [guitar.id]: defaultRecurrenceSchedule(guitar.id, today),
    [code.id]: {
      ...defaultRecurrenceSchedule(code.id, today),
      weekdays: [1, 3],
    },
  };

  return {
    version: 2,
    seeded: true,
    subjects: [guitar, code],
    nodes: [...gNodes, ...cNodes],
    items,
    library,
    schedules,
    daypartEnabled: { sang: true, chieu: true, toi: false },
    daypartEnabledByDate: {},
    completions: [],
  };
}

export function createEmptyWorkingState(): AppState {
  return {
    version: 2,
    seeded: true,
    subjects: [],
    nodes: [],
    items: [],
    library: [],
    schedules: {},
    daypartEnabled: { sang: true, chieu: true, toi: true },
    daypartEnabledByDate: {},
    completions: [],
  };
}

export { uid };
