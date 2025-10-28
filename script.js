const experiment = {
  times: [],
  maxTrials: 10,
  waitHnd: -1,
  started: false,
  ended: false,
  stimulusWait: false,
  circleColours : ["", ""],
  stimulusShownAt: -1,
  btnDisabled:false
};

const minWaitTime = 0.5;
const maxWaitTime = 1.0;
const stimulusMissTime = 1.5;

const btn = document.querySelector(".button-default");
const stimuli = document.querySelectorAll(".circle");
let circle1 = stimuli[0];
let circle2 = stimuli[1];
let circles = [circle1, circle2];
var nextCircle = 0;

const colours = ["red", "orange", "green"]// "blue", "violet"]

var experimentAdvanced = false;

const advanceTrial = function (missed=false) {
  
  //resetStimuli();

  experiment.stimulusShown = false;
  if (experiment.times.length < experiment.maxTrials) {
    if(!missed && experimentAdvanced) return;
    //still need to run more trials
    experimentAdvanced = true;
    scheduleStimulus();
    
  } else {
    //experiment ended
  endExperiment();
  }
};

const endExperiment = function () {
  console.info("INFO: Experiment ended. Await download of results");

  experiment.ended = true;

  //Update Button Styling
  experiment.btnDisabled = false;
  btn.classList.toggle("button-enabled");
  btn.classList.toggle("button-disabled");
  btn.textContent = "Download Data";
};

const scheduleStimulus = function () {
  var waitTime = (Math.random() * maxWaitTime) + minWaitTime;

  if(experiment.stimulusShown) waitTime = stimulusMissTime;

  //experiment.stimulusWait = true;
  experiment.waitHnd = window.setTimeout(changeRandomCircleColour, waitTime * 1000); //setTimeout runs in milliseconds
};

const showStimulus = function () {
  experiment.stimulusShownAt = Date.now();
  console.info(
    "INFO: Trial",
    experiment.times.length,
    ". Stimulus shown",
    experiment.stimulusShownAt
  );
  experiment.stimulusShown = true;
};

const missStimulus = function() {
  experiment.stimulusShown = false;

  console.info("INFO: User missed stimulus.");

  experiment.times.push(stimulusMissTime);
  document.querySelector("#time").textContent = stimulusMissTime + " ms";

  advanceTrial();
}

//------------------------
const getRandomColour = function(){
  return colours[Math.floor(Math.random() * colours.length)];
}

const changeRandomCircleColour = function(){
  var colour = getRandomColour();
  while(experiment.circleColours[nextCircle] == colour) colour = getRandomColour();

  changeCircleColour(nextCircle, colour);
}

const changeCircleColour = function (circleNum, colour) {
  nextCircle == 0 ? nextCircle = 1 : nextCircle = 0;

  console.log("change circle " , circleNum, " to ", colour)

  circles[circleNum].classList.remove("inactive");
  deleteColoursFromStimulus(circleNum);

  circles[circleNum].classList.add(colour);

  experiment.circleColours[circleNum] = colour;

  if (experiment.circleColours[0] == experiment.circleColours[1]){
    showStimulus();
  }
  else if(experiment.stimulusShown){
    userReaction(true);
    return;
  }
  scheduleStimulus();
};

const deleteColoursFromStimulus = function(circleNum){
  for(let i = 0; i < colours.length; i++){
    circles[circleNum].classList.remove(colours[i]);
  }
}

const resetStimuli = function(){
  console.log("Reset both circles");

  for(let i = 0; i < circles.length; i++){
    for(let j = 0; j < colours.length; j++){
      circles[i].classList.remove(colours[j]);
    }
    circles[i].classList.remove("style");
    circles[i].classList.add("inactive");
    experiment.circleColours = ["", ""];
  }
}
//-----------------------

const logReaction = function (missed=false) {
  let userReactedAt = Date.now();
  console.info("INFO: User reaction captured.", userReactedAt);

  let deltaTime = userReactedAt - experiment.stimulusShownAt;
  if(missed) deltaTime = stimulusMissTime * 1000;

  experiment.times.push(deltaTime);
  document.querySelector("#time").textContent = deltaTime + " ms";
};

const userReaction = function (missed=false) {
  console.log("User reaction!")
  if (!experiment.started) {
    console.log("experiment not started :(");
    return;
  } //prior to start of experiment, ignore

  if (experiment.stimulusShown) {
    console.log("stimulus shown!");
    
    if(missed) console.log("missed it though");
    //stimulus is visible, capture
    logReaction(missed);
    advanceTrial(missed);
  }
  else{
    //missStimulus();
  }
};

const startExperiment = function () {
  console.info("INFO: Experiment Started");
  stimulus.style = "background-color:'';";
  document.querySelector("#instructions").style.display = "none";
  experiment.started = true;

  window.addEventListener("keypress", onKey); //add keylistener
  advanceTrial();
};

const btnAction = function () {
  console.debug("DBG:", "click");
  if(experiment.btnDisabled) return;
  if (!experiment.ended) {
    experiment.btnDisabled = true;
    btn.classList.toggle("button-enabled");
    btn.classList.toggle("button-disabled");
  }
  if (!experiment.started) {
    startExperiment();
  } else {
    if (experiment.ended) {
      exportExperimentLog();
      const stats = computeStatistics(experiment.times);
      document.querySelector("#time").textContent = [
        "Count:",
        stats.cnt,
        "Mean:",
        stats.mean.toFixed(2),
        "ms",
        "SD:",
        stats.sd.toFixed(2),
        "ms",
      ].join(" ");
    } else {
      console.log("DBG: Should this occur?");
    }
  }
};

const computeStatistics = function (timeArr) {
  //to get mean, get sum of all trials and divide by number of trials m = sum(x)/cnt(x)
  const sums = timeArr.reduce((acc, num) => acc + num, 0);
  const meanDeltaTime = sums / timeArr.length;

  //standard deviation is  sqrt(sum(x-mean)^2/cnt(x))
  const squaredDiffs = timeArr.reduce(
    (acc, num) => (num - meanDeltaTime) ** 2 + acc,
    0
  );
  const standardDeviationTime = Math.sqrt(squaredDiffs / timeArr.length);

  return {
    sd: standardDeviationTime,
    mean: meanDeltaTime,
    cnt: timeArr.length,
  };
};

const exportExperimentLog = function () {
  let csvHeader = "pid,trial#,reactionTime (ms)\n";
  let pid = Math.floor(Math.random() * 900000) + 100000;
  let csvData = experiment.times
    .map((time, idx) => [pid, idx, time].join(","))
    .join("\n"); //map passes every record in the log array to the getCSVDataLine, we also need to include pid to all rows
  exportData(csvHeader + csvData, "VisualReactionTestResults.csv");
};

const exportData = function (csvDataString, exportFileName) {
  // Create a Blob with the CSV data
  const blob = new Blob([csvDataString], { type: "text/csv" });

  // Create a temporary link element
  const a = document.createElement("a");
  a.href = window.URL.createObjectURL(blob);
  a.download = exportFileName;

  // Trigger the download
  document.body.appendChild(a);
  a.style.display = "none";
  a.click();

  // Clean up
  window.URL.revokeObjectURL(a.href);
  document.body.removeChild(a);
};

const onKey = function (evt) {
  if (evt == null) {
    evt = window.event;
  }
  switch (evt.which || evt.charCode || evt.keyCode) {
    case 32: //space
      userReaction();
      break;
    default:
      console.warn("WARN: Key:", evt, evt.which, evt.charCode, evt.keyCode);
  }
};

btn.addEventListener("click", btnAction);
