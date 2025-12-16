import React, { useState } from "react";
import {
  Box, Tabs, Tab, Typography, Paper, Grid, TextField, Slider,
  Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, Checkbox,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider
} from "@mui/material";
import Plot from "react-plotly.js";
import CalculateIcon from '@mui/icons-material/Calculate';
import GroupIcon from '@mui/icons-material/Group';
import GroupsIcon from '@mui/icons-material/Groups';


// ===== 계산 함수(동일) =====
function createResultTable(
  공구가, 할인율, 셀러수수료율, 벤더수수료율, pg수수료율,
  결제주체, 공급사PG부담시_셀러사업자, 제품원가, 포장비, 택배비,
  is_벤더사거래 = false
) {
  let net_price = Math.round(공구가 * (1 - 할인율 / 100));
  let 셀러_회계상_비용 = 0;
  let 셀러_실지급액 = 0;
  let 셀러_원천징수 = 0;
  if (!is_벤더사거래 && 결제주체 === "공급사" && !공급사PG부담시_셀러사업자) {
    let 예상_지급총액 = net_price * 셀러수수료율 / 100;
    let 세전 = 예상_지급총액 / 1.1;
    셀러_원천징수 = 세전 * 0.033;
    셀러_회계상_비용 = 세전;
    셀러_실지급액 = 세전 - 셀러_원천징수;
  } else {
    셀러_회계상_비용 = net_price * 셀러수수료율 / 100;
    셀러_실지급액 = 셀러_회계상_비용;
  }
  let vendor_fee = is_벤더사거래 ? net_price * 벤더수수료율 / 100 : 0;
  let pg_fee = 결제주체 === "공급사" ? net_price * pg수수료율 / 100 : 0;
  let supplier_income_before_expense = net_price - 셀러_회계상_비용 - vendor_fee;
  let supplier_costs = 제품원가 + 포장비 + 택배비;
  let taxable_base = supplier_income_before_expense - pg_fee - supplier_costs;
  let vat = taxable_base > 0 ? taxable_base / 11 : 0;
  let margin_before_tax = supplier_income_before_expense - pg_fee - supplier_costs;
  let margin_after_tax = margin_before_tax - 셀러_원천징수 - vat;
  let margin_rate = net_price !== 0 ? Math.round((margin_after_tax / net_price) * 1000) / 10 : 0;
  let margin_desc = (!is_벤더사거래 && 결제주체 === "공급사" && !공급사PG부담시_셀러사업자)
    ? "실마진(원천징수/부가세 차감)" : "실마진(부가세 차감)";
  let y_summary = [
    { 구매점: "셀러", "마진액 (원)": Math.round(셀러_실지급액), "공구가 대비 (%)": net_price ? Math.round((셀러_실지급액 / net_price) * 1000) / 10 : 0 },
    { 구매점: "벤더사", "마진액 (원)": Math.round(vendor_fee), "공구가 대비 (%)": is_벤더사거래 && net_price ? Math.round((vendor_fee / net_price) * 1000) / 10 : 0 },
    { 구매점: `공급사 (${margin_desc})`, "마진액 (원)": Math.round(margin_after_tax), "공구가 대비 (%)": margin_rate }
  ];
  let details = [
    { 항목: "1. 공구가 (판매가)", "금액(원)": net_price, 계산식: "공구가 × (1 - 할인율%)" },
    { 항목: "2. 셀러 수수료 (회계상 비용 기준)", "금액(원)": Math.round(셀러_회계상_비용), 계산식: "공구가(할인후) × 셀러수수료율%" },
    { 항목: is_벤더사거래 ? "3. 벤더사 수수료" : "3. 벤더사 수수료 (해당 없음)", "금액(원)": Math.round(vendor_fee), 계산식: is_벤더사거래 ? "공구가(할인후) × 벤더수수료율%" : "해당없음" },
    { 항목: "4. PG 수수료 (공급사 부담 시)", "금액(원)": Math.round(pg_fee), 계산식: 결제주체 === "공급사" ? "공구가(할인후) × PG수수료율%" : "해당없음" },
    { 항목: "5. 수수료 차감 후 입금액(공급가)", "금액(원)": Math.round(supplier_income_before_expense), 계산식: "공구가(할인후) - 셀러수수료 - 벤더사수수료" },
    { 항목: "6. 공급사 총비용 (제품+포장+택배)", "금액(원)": supplier_costs, 계산식: "제품원가 + 포장비 + 택배비" },
    { 항목: "7. 원천징수 (비사업자)", "금액(원)": Math.round(셀러_원천징수), 계산식: (!공급사PG부담시_셀러사업자 && !is_벤더사거래 && 결제주체 === "공급사") ? "셀러수수료(세전) × 3.3%" : "해당없음" },
    { 항목: "8. 부가세 (VAT)", "금액(원)": Math.round(vat), 계산식: (taxable_base > 0) ? "(수수료차감 후 입금액 - PG수수료 - 공급사총비용) ÷ 11" : "0" },
    { 항목: "9. 결제수수료·비용 차감 후 마진", "금액(원)": Math.round(margin_before_tax), 계산식: "수수료차감후 입금액 - PG수수료 - 공급사총비용" },
    { 항목: `10. 공급사 실마진 (${margin_desc})`, "금액(원)": Math.round(margin_after_tax), 계산식: "결제수수료·비용 차감 후 마진 - (원천징수 + 부가세)" }
  ];
  let 셀러_detail = null;
  if (!공급사PG부담시_셀러사업자 && !is_벤더사거래 && 결제주체 === "공급사") {
    셀러_detail = [
      { 항목: "1. 셀러 수수료율 기반 지급총액", "금액(원)": Math.round(net_price * 셀러수수료율 / 100), 계산식: `${net_price} * ${셀러수수료율}%` },
      { 항목: "2. 세금계산서 미발급으로 부가세 제거", "금액(원)": Math.round(셀러_회계상_비용), 계산식: "÷ 1.1" },
      { 항목: "3. 원천징수 3.3% 공제", "금액(원)": Math.round(셀러_원천징수), 계산식: "× 3.3%" },
      { 항목: "4. 최종 셀러 입금액", "금액(원)": Math.round(셀러_실지급액), 계산식: "세전금액 - 원천징수" }
    ];
  }
  return {
    net_price, margin_after_tax, margin_rate, y_summary, details, 셀러_detail,
    셀러_실지급액: Math.round(셀러_실지급액),
    벤더사_마진: Math.round(vendor_fee),
    공급사_마진: Math.round(margin_after_tax)
  };
}

// --------- MAIN COMPONENT ----------
function App() {
  // --- 상태 (탭/입력값 등) ---
  const [tab, setTab] = useState(0);
  // 탭1: 셀러와 직접공구
  const [공구가, set공구가] = useState(30000);
  const [할인율, set할인율] = useState(10);
  const [셀러수수료율, set셀러수수료율] = useState(40);
  const [pg수수료율, setpg수수료율] = useState(3.0);
  const [결제주체, set결제주체] = useState("공급사");
  const [공급사PG부담시_셀러사업자, set공급사PG부담시_셀러사업자] = useState(true);
  const [제품원가, set제품원가] = useState(5200);
  const [포장비, set포장비] = useState(300);
  const [택배비, set택배비] = useState(3300);

  // 탭2: 벤더사 협업공구
  const [공구가2, set공구가2] = useState(30000);
  const [할인율2, set할인율2] = useState(10);
  const [셀러수수료율2, set셀러수수료율2] = useState(20);
  const [벤더수수료율2, set벤더수수료율2] = useState(20);
  const [pg수수료율2, setpg수수료율2] = useState(3.0);
  const [결제주체2, set결제주체2] = useState("공급사");
  const [제품원가2, set제품원가2] = useState(5200);
  const [포장비2, set포장비2] = useState(300);
  const [택배비2, set택배비2] = useState(3300);

  // ------ 계산결과 -------
  const result1 = createResultTable(
    공구가, 할인율, 셀러수수료율, 0, pg수수료율,
    결제주체, 공급사PG부담시_셀러사업자, 제품원가, 포장비, 택배비, false
  );
  const result2 = createResultTable(
    공구가2, 할인율2, 셀러수수료율2, 벤더수수료율2, pg수수료율2,
    결제주체2, true, 제품원가2, 포장비2, 택배비2, true
  );

  // ------ 할인율 변화에 따른 마진 시각화 (실시간 반영!) -------
  const discountRange = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const marginList = discountRange.map(hy =>
    createResultTable(
      공구가, hy, 셀러수수료율, 0, pg수수료율,
      결제주체, 공급사PG부담시_셀러사업자, 제품원가, 포장비, 택배비, false
    ).공급사_마진
  );
  // 벤더사공구 탭용
  const marginList2 = discountRange.map(hy =>
    createResultTable(
      공구가2, hy, 셀러수수료율2, 벤더수수료율2, pg수수료율2,
      결제주체2, true, 제품원가2, 포장비2, 택배비2, true
    ).공급사_마진
  );

  // ------- 요약표의 마진액 그래프 (셀러/벤더사/공급사) -------
  const barNames = ["셀러", "벤더사", "공급사"];
  const barValues = [
    result1.셀러_실지급액,
    result1.벤더사_마진,
    result1.공급사_마진
  ];
  // 벤더사공구 탭용
  const barValues2 = [
    result2.셀러_실지급액,
    result2.벤더사_마진,
    result2.공급사_마진
  ];
  const barColors = ["#d1432d", "#008d47", "#1976d2"];

  // ------ (NEW) 할인율 그래프의 현재 위치 가이드선(y축 min/max 자동) ------
  const yMin = Math.min(...marginList);
  const yMax = Math.max(...marginList);
  // 벤더사공구 탭용
  const yMin2 = Math.min(...marginList2);
  const yMax2 = Math.max(...marginList2);

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, bgcolor: "#fafcff", minHeight: "100vh" }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <CalculateIcon color="primary" sx={{ fontSize: 38, mr: 1 }} />
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          <span style={{ color: "#13185aff", fontWeight: 900 }}>유근형</span>
          의 공동구매 마진 계산기 <span style={{ color: "#666", fontWeight: 400, fontSize: 23 }}>(공급사 입장)</span>
        </Typography>
      </Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="standard" sx={{ mb: 2 }}>
        <Tab icon={<GroupIcon />} label="셀러와 직접 공구" />
        <Tab icon={<GroupsIcon />} label="벤더사와 협업 공구" />
      </Tabs>

      {/* --- 탭1 : 셀러와 직접 공구 --- */}
      {tab === 0 && (
        <Paper elevation={2} sx={{ p: 3, mb: 2, maxWidth: 1600 }}>
          {/* ... (생략, 기존 그대로) ... */}
          {/* 위에 코드와 동일하므로 건드리지 않음 */}
          {/* === 여기 아래만 기존과 동일 === */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={5} lg={5}>
              {/* 입력폼 (생략) */}
              {/* ...입력폼 기존 코드... */}
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: "flex", alignItems: "center" }}>
                <span role="img" aria-label="bulb" style={{ marginRight: 8 }}>💡</span> 기본 설정
              </Typography>
              <TextField label="온라인최저가 (vat 포함)" type="number" value={공구가} onChange={e => set공구가(Number(e.target.value))} size="small" fullWidth InputProps={{ endAdornment: <span>원</span> }} sx={{ mb: 2 }} />
              <Typography gutterBottom>공급 할인율 (%) : {할인율}</Typography>
              <Slider value={할인율} min={0} max={100} step={1} onChange={(_, v) => set할인율(v)} sx={{ mb: 2 }} />
              <Typography gutterBottom>셀러 수수료율 (%) : {셀러수수료율}</Typography>
              <Slider value={셀러수수료율} min={0} max={100} step={1} onChange={(_, v) => set셀러수수료율(v)} sx={{ mb: 2 }} />
              <Typography gutterBottom>결제 수수료율 (PG, %) : {pg수수료율}</Typography>
              <Slider value={pg수수료율} min={0} max={10} step={0.1} onChange={(_, v) => setpg수수료율(v)} sx={{ mb: 2 }} />
              <FormControl sx={{ mb: 1 }}>
                <FormLabel>결제창(수수료) 주체</FormLabel>
                <RadioGroup row value={결제주체} onChange={e => set결제주체(e.target.value)}>
                  <FormControlLabel value="셀러" control={<Radio />} label="셀러" />
                  <FormControlLabel value="공급사" control={<Radio />} label="공급사" />
                </RadioGroup>
              </FormControl>
              {결제주체 === "공급사" && (
                <FormControlLabel
                  control={
                    <Checkbox checked={공급사PG부담시_셀러사업자} onChange={e => set공급사PG부담시_셀러사업자(e.target.checked)} />
                  }
                  label="셀러가 사업자입니다"
                />
              )}
              <Divider sx={{ my: 2 }} />
              <TextField label="제품 원가 (vat 포함)" type="number" value={제품원가} onChange={e => set제품원가(Number(e.target.value))} size="small" fullWidth sx={{ mb: 1 }} />
              <TextField label="포장비 (vat 포함)" type="number" value={포장비} onChange={e => set포장비(Number(e.target.value))} size="small" fullWidth sx={{ mb: 1 }} />
              <TextField label="택배비 (vat 포함)" type="number" value={택배비} onChange={e => set택배비(Number(e.target.value))} size="small" fullWidth sx={{ mb: 1 }} />
            </Grid>

            {/* --- 오른쪽 : 그래프 + 금액 강조 --- */}
            <Grid item xs={12} md={7} lg={7}>
              <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" } }}>
                {/* 마진액 바차트 */}
                <Box sx={{ width: { xs: "100%", md: "48%" } }}>
                  <Typography fontWeight={700} sx={{ mb: 1 }}>💰 셀러/벤더사/공급사 마진액 비교</Typography>
                  <Plot
                    data={[
                      {
                        x: barNames,
                        y: barValues,
                        type: "bar",
                        marker: { color: barColors },
                        text: barValues.map(v => v.toLocaleString() + "원"),
                        textposition: "auto"
                      }
                    ]}
                    layout={{
                      yaxis: { title: "마진액(원)", zeroline: true, automargin: true },
                      margin: { l: 60, r: 20, t: 30, b: 40 },
                      height: 330,
                      template: "plotly_white"
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    useResizeHandler
                    style={{ width: "100%", minWidth: 320 }}
                  />
                  <Box sx={{ textAlign: "center", mt: 2 }}>
                    <Typography variant="h6" sx={{ color: "#888", fontWeight: 600 }}>
                      공구가(판매가)
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                      {result1.net_price.toLocaleString()} 원
                    </Typography>
                  </Box>
                </Box>
                {/* 할인율 변화에 따른 실마진 라인차트 */}
                <Box sx={{ width: { xs: "100%", md: "52%" } }}>
                  <Typography fontWeight={700} sx={{ mb: 1 }}>
                    📊 할인율 변화에 따른 공급사 실마진(부가세 차감)
                  </Typography>
                  <Plot
                    data={[
                      {
                        x: discountRange,
                        y: marginList,
                        type: "scatter",
                        mode: "lines+markers",
                        name: "공급사 실마진",
                        marker: { color: "#1976d2" }
                      },
                      {
                        x: [할인율, 할인율],
                        y: [yMin, yMax],
                        type: "scatter",
                        mode: "lines",
                        line: { color: "#ff1744", width: 3, dash: "dash" },
                        name: "현재 할인율",
                        hoverinfo: "skip",
                        showlegend: true
                      }
                    ]}
                    layout={{
                      title: { text: "", font: { size: 17 } },
                      xaxis: {
                        title: "공급 할인율 (%)",
                        tickvals: [0, 50, 100],
                        ticktext: ['0', '50', '100']
                      },
                      yaxis: { title: "공급사 실마진(원)", zeroline: true },
                      legend: { orientation: "h", y: -0.3 },
                      margin: { l: 60, r: 20, t: 40, b: 40 },
                      height: 330,
                      template: "plotly_white"
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    useResizeHandler
                    style={{ width: "100%", minWidth: 320 }}
                  />
                  <Box sx={{ textAlign: "center", mt: 2 }}>
                    <Typography variant="h6" sx={{ color: "#1976d2", fontWeight: 600 }}>
                      공급사 실마진(부가세 차감)
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: "#1976d2", mb: 0.5 }}>
                      {result1.공급사_마진.toLocaleString()} 원&nbsp;
                      <span style={{ fontSize: 22, color: "#555", fontWeight: 500 }}>
                        ({result1.margin_rate}%)
                      </span>
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
          {/* === 이하 하단 표 기존과 동일 === */}
          <Grid container spacing={2} sx={{ mt: 3 }}>
            <Grid item xs={12} md={12}>
              <Typography fontWeight={700} sx={{ mt: 1, mb: 1 }}>📋 마진 요약표</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {Object.keys(result1.y_summary[0]).map(key => (
                        <TableCell key={key} sx={{ fontWeight: 700 }}>{key}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result1.y_summary.map((row, i) => (
                      <TableRow key={i}>
                        {Object.values(row).map((v, idx) => (
                          <TableCell key={idx}>{typeof v === "number" ? v.toLocaleString() : v}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            <Grid item xs={12} md={12}>
              <Typography fontWeight={700} sx={{ mt: 3, mb: 1 }}>📑 상세 계산표 (계산식 포함)</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>항목</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>금액(원)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>계산식</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result1.details.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row["항목"]}</TableCell>
                        <TableCell>{row["금액(원)"].toLocaleString()}</TableCell>
                        <TableCell>{row["계산식"]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            {result1.셀러_detail &&
              <Grid item xs={12} md={12}>
                <Box sx={{ mt: 3 }}>
                  <Typography fontWeight={700} sx={{ mb: 1 }}>💡 비사업자 셀러 수령액 계산 과정</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>항목</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>금액(원)</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>계산식</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {result1.셀러_detail.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row["항목"]}</TableCell>
                            <TableCell>{row["금액(원)"].toLocaleString()}</TableCell>
                            <TableCell>{row["계산식"]}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Grid>
            }
          </Grid>
        </Paper>
      )}

      {/* --- 탭2 : 벤더사 협업공구 --- */}
      {tab === 1 && (
        <Paper elevation={2} sx={{ p: 3, mb: 2, maxWidth: 1600 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5} lg={5}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: "flex", alignItems: "center" }}>
                <span role="img" aria-label="bulb" style={{ marginRight: 8 }}>💡</span> 기본 설정
              </Typography>
              <TextField label="온라인최저가 (vat 포함)" type="number" value={공구가2} onChange={e => set공구가2(Number(e.target.value))} size="small" fullWidth InputProps={{ endAdornment: <span>원</span> }} sx={{ mb: 2 }} />
              <Typography gutterBottom>공급 할인율 (%) : {할인율2}</Typography>
              <Slider value={할인율2} min={0} max={100} step={1} onChange={(_, v) => set할인율2(v)} sx={{ mb: 2 }} />
              <Typography gutterBottom>셀러 수수료율 (%) : {셀러수수료율2}</Typography>
              <Slider value={셀러수수료율2} min={0} max={100} step={1} onChange={(_, v) => set셀러수수료율2(v)} sx={{ mb: 2 }} />
              <Typography gutterBottom>벤더사 수수료율 (%) : {벤더수수료율2}</Typography>
              <Slider value={벤더수수료율2} min={0} max={100} step={1} onChange={(_, v) => set벤더수수료율2(v)} sx={{ mb: 2 }} />
              <Typography gutterBottom>결제 수수료율 (PG, %) : {pg수수료율2}</Typography>
              <Slider value={pg수수료율2} min={0} max={10} step={0.1} onChange={(_, v) => setpg수수료율2(v)} sx={{ mb: 2 }} />
              <FormControl sx={{ mb: 1 }}>
                <FormLabel>결제창(수수료) 주체</FormLabel>
                <RadioGroup row value={결제주체2} onChange={e => set결제주체2(e.target.value)}>
                  <FormControlLabel value="셀러" control={<Radio />} label="셀러" />
                  <FormControlLabel value="벤더사" control={<Radio />} label="벤더사" />
                  <FormControlLabel value="공급사" control={<Radio />} label="공급사" />
                </RadioGroup>
              </FormControl>
              <Divider sx={{ my: 2 }} />
              <TextField label="제품 원가 (vat 포함)" type="number" value={제품원가2} onChange={e => set제품원가2(Number(e.target.value))} size="small" fullWidth sx={{ mb: 1 }} />
              <TextField label="포장비 (vat 포함)" type="number" value={포장비2} onChange={e => set포장비2(Number(e.target.value))} size="small" fullWidth sx={{ mb: 1 }} />
              <TextField label="택배비 (vat 포함)" type="number" value={택배비2} onChange={e => set택배비2(Number(e.target.value))} size="small" fullWidth sx={{ mb: 1 }} />
            </Grid>
            {/* --- 오른쪽 : 그래프 + 금액 강조(추가) --- */}
            <Grid item xs={12} md={7} lg={7}>
              <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" } }}>
                {/* 마진액 바차트 */}
                <Box sx={{ width: { xs: "100%", md: "48%" } }}>
                  <Typography fontWeight={700} sx={{ mb: 1 }}>💰 셀러/벤더사/공급사 마진액 비교</Typography>
                  <Plot
                    data={[
                      {
                        x: barNames,
                        y: barValues2,
                        type: "bar",
                        marker: { color: barColors },
                        text: barValues2.map(v => v.toLocaleString() + "원"),
                        textposition: "auto"
                      }
                    ]}
                    layout={{
                      yaxis: { title: "마진액(원)", zeroline: true, automargin: true },
                      margin: { l: 60, r: 20, t: 30, b: 40 },
                      height: 330,
                      template: "plotly_white"
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    useResizeHandler
                    style={{ width: "100%", minWidth: 320 }}
                  />
                  <Box sx={{ textAlign: "center", mt: 2 }}>
                    <Typography variant="h6" sx={{ color: "#888", fontWeight: 600 }}>
                      공구가(판매가)
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                      {result2.net_price.toLocaleString()} 원
                    </Typography>
                  </Box>
                </Box>
                {/* 할인율 변화에 따른 실마진 라인차트 */}
                <Box sx={{ width: { xs: "100%", md: "52%" } }}>
                  <Typography fontWeight={700} sx={{ mb: 1 }}>
                    📊 할인율 변화에 따른 공급사 실마진(부가세 차감)
                  </Typography>
                  <Plot
                    data={[
                      {
                        x: discountRange,
                        y: marginList2,
                        type: "scatter",
                        mode: "lines+markers",
                        name: "공급사 실마진",
                        marker: { color: "#1976d2" }
                      },
                      {
                        x: [할인율2, 할인율2],
                        y: [yMin2, yMax2],
                        type: "scatter",
                        mode: "lines",
                        line: { color: "#ff1744", width: 3, dash: "dash" },
                        name: "현재 할인율",
                        hoverinfo: "skip",
                        showlegend: true
                      }
                    ]}
                    layout={{
                      title: { text: "", font: { size: 17 } },
                      xaxis: {
                        title: "공급 할인율 (%)",
                        tickvals: [0, 50, 100],
                        ticktext: ['0', '50', '100']
                      },
                      yaxis: { title: "공급사 실마진(원)", zeroline: true },
                      legend: { orientation: "h", y: -0.3 },
                      margin: { l: 60, r: 20, t: 40, b: 40 },
                      height: 330,
                      template: "plotly_white"
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    useResizeHandler
                    style={{ width: "100%", minWidth: 320 }}
                  />
                  <Box sx={{ textAlign: "center", mt: 2 }}>
                    <Typography variant="h6" sx={{ color: "#1976d2", fontWeight: 600 }}>
                      공급사 실마진(부가세 차감)
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: "#1976d2", mb: 0.5 }}>
                      {result2.공급사_마진.toLocaleString()} 원&nbsp;
                      <span style={{ fontSize: 22, color: "#555", fontWeight: 500 }}>
                        ({result2.margin_rate}%)
                      </span>
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
          {/* === 이하 표 (마진요약/상세표) 기존과 동일 === */}
          <Grid container spacing={2} sx={{ mt: 3 }}>
            <Grid item xs={12} md={12}>
              <Typography fontWeight={700} sx={{ mt: 1, mb: 1 }}>📋 마진 요약표</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {Object.keys(result2.y_summary[0]).map(key => (
                        <TableCell key={key} sx={{ fontWeight: 700 }}>{key}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result2.y_summary.map((row, i) => (
                      <TableRow key={i}>
                        {Object.values(row).map((v, idx) => (
                          <TableCell key={idx}>{typeof v === "number" ? v.toLocaleString() : v}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            <Grid item xs={12} md={12}>
              <Typography fontWeight={700} sx={{ mt: 3, mb: 1 }}>📑 상세 계산표 (계산식 포함)</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>항목</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>금액(원)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>계산식</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result2.details.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row["항목"]}</TableCell>
                        <TableCell>{row["금액(원)"].toLocaleString()}</TableCell>
                        <TableCell>{row["계산식"]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
}

export default App;
