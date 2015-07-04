/* global Highcharts */
var chartsLevel = {
		weekly: 0,
		monthly: 1,
		yearly: 2
	},
	currentChartsLevel = chartsLevel.weekly;
	chartData = new ChartData();

//Holds a 365 length array of a weather measurement
function ChartSeries(startDate) {
	this.startDate = startDate;
	this.data = new Array(365);
	this.monthsData = [];

	for (var i = 0; i < this.data.length; this.data[i] = null, i++);
}

ChartSeries.prototype.insertAtDate = function(dateStr, value) {
	var index = Util.getDateIndex(dateStr, this.startDate);

	if (index < 0 || index >= 365)	{
		console.log('Index %d for date %s outside needed range', index, dateStr);
		return false;
	}

	this.data[index] = value;
	return true;
};

ChartSeries.prototype.getAtDate = function(dateStr) {
	var index = Util.getDateIndex(dateStr, this.startDate);
	if (index < 0 || index >= 365) {
    		console.log('Index %d for date %s outside needed range', index, dateStr);
		return null;
	}

	return this.data[index];
};

//Object that holds entire weather/programs watering data
function ChartData() {
	this.days = []; //array with dates ('YYYY-MM-DD')
	this.months = [];
	this.maxWN = 100; //maximum percentage of water need/used

	var end = new Date();
	end.setDate(end.getDate() + 7); //Forecast for 7 days in the future

	this.startDate = new Date(end);  //The start date in the past for this chart data
	this.startDate.setFullYear(end.getFullYear() - 1);

	//Fill a 356 array with dates
	var _start = new Date(this.startDate);
	while (_start < end) {
		var isoDate = _start.toISOString().split('T')[0],
			isoDateMonthStart = isoDate.split('-')[0] + '-' + isoDate.split('-')[1] + '-' + '01';

		this.days.push(isoDate);

		if (this.months.length === 0 || this.months[this.months.length - 1] !== isoDateMonthStart) {
			this.months.push(isoDateMonthStart);
		}

		_start.setDate(_start.getDate() + 1);
	}

	this.qpf = new ChartSeries(this.startDate);
	this.maxt = new ChartSeries(this.startDate);
	this.mint = new ChartSeries(this.startDate);
	this.waterNeed = new ChartSeries(this.startDate);
	this.condition = new ChartSeries(this.startDate);
	this.programs = [];

	console.log('Initialised ChartData from %s to %s',this.startDate.toDateString(), end.toDateString());
}

function fillChartData(pastDays) {
	Data.mixerData = API.getMixer(); //for weather measurements
	Data.dailyDetails = API.getDailyStats(null, true); //for water need in the future
	Data.waterLog = API.getWateringLog(false, true,  Util.getDateWithDaysDiff(pastDays), pastDays); //for used water

	var mixedDataIndex,
		programIndex,
		dailyValuesIndex,
		dailyDetailsIndex,
		zoneIndex,
		monthsIndex,
		daysIndex,
		currentProgram,
		currentProgramIndex;

	//Get all available days in mixer TODO: Can be quite long (365 days)
	for (mixedDataIndex = 0; mixedDataIndex < Data.mixerData.mixerData.length; mixedDataIndex++) {
		var recent = Data.mixerData.mixerData[mixedDataIndex].dailyValues;

		for (dailyValuesIndex = 0; dailyValuesIndex < recent.length; dailyValuesIndex++) {
			var dvDay =  recent[dailyValuesIndex].day.split(' ')[0];
			chartData.qpf.insertAtDate(dvDay, recent[dailyValuesIndex].qpf);
			chartData.maxt.insertAtDate(dvDay, recent[dailyValuesIndex].maxTemp);
			chartData.mint.insertAtDate(dvDay, recent[dailyValuesIndex].minTemp);
			chartData.condition.insertAtDate(dvDay, recent[dailyValuesIndex].condition);
		}
	}

	//Total Water Need future days
	var daily = Data.dailyDetails.DailyStatsDetails;

	for (dailyDetailsIndex = 0; dailyDetailsIndex < daily.length; dailyDetailsIndex++) {
		var wnfTotalDayUserWater = 0,
			wnfTotalDayScheduledWater = 0;

		//programs for the day
		for (programIndex = 0; programIndex < daily[dailyDetailsIndex].programs.length; programIndex++) {
			currentProgram = daily[dailyDetailsIndex].programs[programIndex];

			// Program index not in our struct ?
			if (programIndex > chartData.programs.length - 1) {
				currentProgramIndex = chartData.programs.push(new ChartSeries(chartData.startDate)) - 1;
			} else {
				currentProgramIndex = programIndex;
			}

			//zones for the programs
			for (zoneIndex = 0; zoneIndex < currentProgram.zones.length; zoneIndex++) {
				wnfTotalDayUserWater += currentProgram.zones[zoneIndex].computedWateringTime;
				wnfTotalDayScheduledWater += currentProgram.zones[zoneIndex].scheduledWateringTime;
				//console.log('User: %d, Scheduled: %d', wnfTotalDayUserWater, wnfTotalDayScheduledWater);
			}

			var wnfProgramDayWN = Util.normalizeWaterNeed(wnfTotalDayUserWater, wnfTotalDayScheduledWater);
			chartData.programs[currentProgramIndex].insertAtDate(daily[dailyDetailsIndex].day, wnfProgramDayWN);
		}

		var wnfDailyWN = Util.normalizeWaterNeed(wnfTotalDayUserWater, wnfTotalDayScheduledWater);
		if (wnfDailyWN > chartData.maxWN)
			chartData.maxWN = wnfDailyWN;

		chartData.waterNeed.insertAtDate(daily[dailyDetailsIndex].day, wnfDailyWN);
	}

	//Used 'water need'
	for (var i = Data.waterLog.waterLog.days.length - 1; i >= 0 ; i--) {
		var day =  Data.waterLog.waterLog.days[i];
		var wnpTotalDayUserWater = 0,
			wnpTotalDayScheduledWater = 0;

		for (programIndex = 0; programIndex < day.programs.length; programIndex++) {
			currentProgram = day.programs[programIndex];

			// Program index not in our struct ?
			if (programIndex > chartData.programs.length - 1) {
				currentProgramIndex = chartData.programs.push(new ChartSeries(chartData.startDate)) - 1;
			} else {
				currentProgramIndex = programIndex;
			}

			for (zoneIndex = 0; zoneIndex < currentProgram.zones.length; zoneIndex++) {
				var zone = currentProgram.zones[zoneIndex];
				//var zoneDurations = { machine: 0, user: 0, real: 0 };
				for (var c = 0; c < zone.cycles.length; c++) {
					var cycle = zone.cycles[c];
					wnpTotalDayScheduledWater += cycle.realDuration;
					wnpTotalDayUserWater += cycle.userDuration;
				}

				var wnpProgramDayWN = Util.normalizeWaterNeed(wnpTotalDayUserWater, wnpTotalDayScheduledWater);
				chartData.programs[currentProgramIndex].insertAtDate(day.date, wnpProgramDayWN);
			}
		}

		var wnpDailyWN = Util.normalizeWaterNeed(wnpTotalDayUserWater, wnpTotalDayScheduledWater);
		if (wnpDailyWN > chartData.maxWN) {
			chartData.maxWN = wnpDailyWN;
		}

		chartData.waterNeed.insertAtDate(day.date, wnpDailyWN);
	}

	// calculate months data
	for (monthsIndex = 0; monthsIndex < chartData.months.length; monthsIndex++) {
		var daysInMonth = 0,
			monthPrefix = chartData.months[monthsIndex].split('-')[0] + '-' + chartData.months[monthsIndex].split('-')[1];

		// initialize the months data for each chart with 0
		chartData.waterNeed.monthsData[monthsIndex] = 0;
		chartData.maxt.monthsData[monthsIndex] = 0;
		chartData.mint.monthsData[monthsIndex] = 0;
		chartData.qpf.monthsData[monthsIndex] = 0;
		for (programIndex = 0; programIndex < chartData.programs.length; programIndex++) {
			chartData.programs[programIndex].monthsData[monthsIndex] = 0;
		}

		// go through all of the days data and aggregate them (sum)
		for (daysIndex = 0; daysIndex < chartData.days.length; daysIndex++) {
			if (chartData.days[daysIndex].indexOf(monthPrefix) >= 0) {
				daysInMonth++;

				chartData.waterNeed.monthsData[monthsIndex] += chartData.waterNeed.getAtDate(chartData.days[daysIndex]) === null ? 0 : chartData.waterNeed.getAtDate(chartData.days[daysIndex]);
				chartData.maxt.monthsData[monthsIndex] += chartData.maxt.getAtDate(chartData.days[daysIndex]) === null ? 0 : chartData.maxt.getAtDate(chartData.days[daysIndex]);
				chartData.mint.monthsData[monthsIndex] += chartData.mint.getAtDate(chartData.days[daysIndex]) === null ? 0 : chartData.mint.getAtDate(chartData.days[daysIndex]);
				chartData.qpf.monthsData[monthsIndex] += chartData.qpf.getAtDate(chartData.days[daysIndex]) === null ? 0 : chartData.qpf.getAtDate(chartData.days[daysIndex]);

				for (programIndex = 0; programIndex < chartData.programs.length; programIndex++) {
					chartData.programs[programIndex].monthsData[monthsIndex] += chartData.programs[programIndex].getAtDate(chartData.days[daysIndex]) === null ? 0 : chartData.programs[programIndex].getAtDate(chartData.days[daysIndex]);
				}
			}
		}

		// for all the charts except QPF we need to aggregate with an AVG (and round to max two decimals)
		chartData.waterNeed.monthsData[monthsIndex] = Math.round((chartData.waterNeed.monthsData[monthsIndex] / daysInMonth) * 100) / 100;
		chartData.maxt.monthsData[monthsIndex] = Math.round((chartData.maxt.monthsData[monthsIndex] / daysInMonth) * 100) / 100;
		chartData.mint.monthsData[monthsIndex] = Math.round((chartData.mint.monthsData[monthsIndex] / daysInMonth) * 100) / 100;
		for (programIndex = 0; programIndex < chartData.programs.length; programIndex++) {
			chartData.programs[programIndex].monthsData[monthsIndex] = Math.round((chartData.programs[programIndex].monthsData[monthsIndex]) / daysInMonth * 100) / 100;
		}
	}
}

function generateCharts(shouldRefreshData, pastDays) {
	if (shouldRefreshData) {
		fillChartData(pastDays);
	}

	generateProgramsChartsContainers();

	// make the dashboard visible before generating the charts so that the charts can take the correct size
	makeVisibleBlock($('#dashboard'));

	generateWeeklyCharts();
}

function generateProgramsChartsContainers () {
	for (var programIndex = 0; programIndex < chartData.programs.length; programIndex++) {
		var div = addTag($('#dashboard'), 'div');
		div.id = 'programChartContainer-' + programIndex;
		div.className = 'charts';
	}
}

function generateWeeklyCharts() {
	currentChartsLevel = chartsLevel.weekly;

	var daysSlice = -14;

	var axisCategories = chartData.days.slice(daysSlice),
		waterNeedChartSeriesData = chartData.waterNeed.data.slice(daysSlice),
		temperatureChartMaxTSeriesData = chartData.maxt.data.slice(daysSlice),
		temperatureChartMinTSeriesData = chartData.mint.data.slice(daysSlice),
		qpfChartSeriesData = chartData.qpf.data.slice(daysSlice);

	generateWeeklyWaterNeedChart(axisCategories, waterNeedChartSeriesData);
	generateWeeklyTemperatureChart(axisCategories, temperatureChartMaxTSeriesData, temperatureChartMinTSeriesData);
	generateWeeklyQPFChart(axisCategories, qpfChartSeriesData);

	for (var programIndex = 0; programIndex < chartData.programs.length; programIndex++) {
		var programChartSeriesData = chartData.programs[programIndex].data.slice(daysSlice);
		generateWeeklyProgramChart(programIndex, axisCategories, programChartSeriesData);
	}
}

function generateMonthlyCharts() {
	currentChartsLevel = chartsLevel.monthly;

	var daysSlice = -20;

	var axisCategories = chartData.days.slice(daysSlice),
		waterNeedChartSeriesData = chartData.waterNeed.data.slice(daysSlice),
		temperatureChartMaxTSeriesData = chartData.maxt.data.slice(daysSlice),
		temperatureChartMinTSeriesData = chartData.mint.data.slice(daysSlice),
		qpfChartSeriesData = chartData.qpf.data.slice(daysSlice);

	generateMonthlyWaterNeedChart(axisCategories, waterNeedChartSeriesData);
	generateMonthlyTemperatureChart(axisCategories, temperatureChartMaxTSeriesData, temperatureChartMinTSeriesData);
	generateMonthlyQPFChart(axisCategories, qpfChartSeriesData);

	for (var programIndex = 0; programIndex < chartData.programs.length; programIndex++) {
		var programChartSeriesData = chartData.programs[programIndex].data.slice(daysSlice);
		generateMonthlyProgramChart(programIndex, axisCategories, programChartSeriesData);
	}
}

function generateYearlyCharts() {
	currentChartsLevel = chartsLevel.yearly;

	var axisCategories = chartData.months,
		waterNeedChartSeriesData = chartData.waterNeed.monthsData,
		temperatureChartMaxTSeriesData = chartData.maxt.monthsData,
		temperatureChartMinTSeriesData = chartData.mint.monthsData,
		qpfChartSeriesData = chartData.qpf.monthsData;

	generateYearlyWaterNeedChart(axisCategories, waterNeedChartSeriesData);
	generateYearlyTemperatureChart(axisCategories, temperatureChartMaxTSeriesData, temperatureChartMinTSeriesData);
	generateYearlyQPFChart(axisCategories, qpfChartSeriesData);

	for (var programIndex = 0; programIndex < chartData.programs.length; programIndex++) {
		var programChartSeriesData = chartData.programs[programIndex].monthsData;
		generateYearlyProgramChart(programIndex, axisCategories, programChartSeriesData);
	}
}

function generateWeeklyWaterNeedChart (axisCategories, seriesData) {
	new Highcharts.Chart({
		chart: {
			renderTo: 'waterNeedChartContainer',
			spacingTop: 20,
			marginTop: 130
		},
		series: [{
			data: seriesData,
			dataLabels: {
				enabled: true,
				format: '{y}%',
				inside: true,
				verticalAlign: 'bottom'
			},
			name: 'Water need',
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + '%</span>';
				}
			},
			type: 'column'
		}],
		title: {
			text: '<h1>Water need (%)</h1>',
			useHTML: true
		},
		xAxis: [{
			categories: axisCategories,
			labels: {
				formatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.value)) + '</span>';
				}
			},
			plotLines: [{
				color: 'rgba(0, 0, 255, 0.1)',
				width: 40,
				value: 7
			}]
		}, {
			categories: axisCategories,
			labels: {
				formatter: function () {
					//Our condition mapping in TTF front
					var condition = chartData.condition.getAtDate(this.value),
						temperatureValue = Math.round(chartData.maxt.getAtDate(this.value)),
						conditionValue;

					if (condition === undefined) {
						conditionValue = String.fromCharCode(122);
					} else {
						conditionValue = String.fromCharCode(97 + condition);
					}

					return '<span style="font-family: RainMachine, sans-serif; font-size: 42px;">' + conditionValue + '</span>' +
						'<br />' +
						'<span style="font-size: 16px; line-height: 24px;">' + temperatureValue + '</span>';
				},
				style: {
					color: '#808080',
					textAlign: 'center'
				},
				useHTML: true,
				x: -10
			},
			lineWidth: 0,
			linkedTo: 0,
			offset: 50,
			opposite: true,
			tickWidth: 0
		}],
		yAxis: {
			labels: {
				format: '{value}%'
			},
			max: chartData.maxWN,
			min: 0,
			title: false
		}
	});
}

function generateMonthlyWaterNeedChart (axisCategories, seriesData) {
	new Highcharts.Chart({
		chart: {
			renderTo: 'waterNeedChartContainer',
			spacingTop: 20
		},
		series: [{
			data: seriesData,
			dataLabels: {
				enabled: true,
				format: '{y}%',
				inside: true,
				verticalAlign: 'bottom'
			},
			name: 'Water need',
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + '%</span>';
				}
			},
			type: 'column'
		}],
		title: {
			text: '<h1>Water need (%)</h1>',
			useHTML: true
		},
		xAxis: [{
			categories: axisCategories,
			labels: {
				formatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.value)) + '</span>';
				}
			}
		}],
		yAxis: {
			labels: {
				format: '{value}%'
			},
			max: chartData.maxWN,
			min: 0,
			title: false
		}
	});
}

function generateYearlyWaterNeedChart (axisCategories, seriesData) {
	new Highcharts.Chart({
		chart: {
			renderTo: 'waterNeedChartContainer',
			spacingTop: 20
		},
		series: [{
			data: seriesData,
			dataLabels: {
				enabled: true,
				format: '{y}%',
				inside: true,
				verticalAlign: 'bottom'
			},
			name: 'Water need',
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b', new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + '%</span>';
				}
			},
			type: 'column'
		}],
		title: {
			text: '<h1>Water need (%)</h1>',
			useHTML: true
		},
		xAxis: [{
			categories: axisCategories,
			labels: {
				formatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b', new Date(this.value)) + '</span>';
				}
			}
		}],
		yAxis: {
			labels: {
				format: '{value}%'
			},
			max: chartData.maxWN,
			min: 0,
			title: false
		}
	});
}

function generateWeeklyTemperatureChart (axisCategories, firstSeriesData, secondSeriesData) {
	new Highcharts.Chart({
		chart: {
			renderTo: 'temperatureChartContainer',
			spacingTop: 20
		},
		series: [{
			data: firstSeriesData,
			name: 'Maximum Temperature',
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + '\xB0C</span>';
				}
			},
			type: 'line'
		}, {
			data: secondSeriesData,
			name: 'Minimum Temperature',
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + '\xB0C</span>';
				}
			},
			type: 'line'
		}],
		title: {
			text: '<h1>Temperature (&deg;C)</h1>',
			useHTML: true
		},
		xAxis: {
			categories: axisCategories,
			labels: {
				formatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.value)) + '</span>';
				}
			},
			plotLines: [{
				color: 'rgba(0, 0, 255, 0.1)',
				width: 40,
				value: 7
			}]
		},
		yAxis: {
			labels: {
				format: '{value}\xB0C'
			},
			title: false
		}
	});
}

function generateMonthlyTemperatureChart (axisCategories, firstSeriesData, secondSeriesData) {
	new Highcharts.Chart({
		chart: {
			renderTo: 'temperatureChartContainer',
			spacingTop: 20
		},
		series: [{
			data: firstSeriesData,
			name: 'Maximum Temperature',
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + '\xB0C</span>';
				}
			},
			type: 'line'
		}, {
			data: secondSeriesData,
			name: 'Minimum Temperature',
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + '\xB0C</span>';
				}
			},
			type: 'line'
		}],
		title: {
			text: '<h1>Temperature (&deg;C)</h1>',
			useHTML: true
		},
		xAxis: {
			categories: axisCategories,
			labels: {
				formatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.value)) + '</span>';
				}
			}
		},
		yAxis: {
			labels: {
				format: '{value}\xB0C'
			},
			title: false
		}
	});
}

function generateYearlyTemperatureChart (axisCategories, firstSeriesData, secondSeriesData) {
	new Highcharts.Chart({
		chart: {
			renderTo: 'temperatureChartContainer',
			spacingTop: 20
		},
		series: [{
			data: firstSeriesData,
			name: 'Maximum Temperature',
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b', new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + '\xB0C</span>';
				}
			},
			type: 'line'
		}, {
			data: secondSeriesData,
			name: 'Minimum Temperature',
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b', new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + '\xB0C</span>';
				}
			},
			type: 'line'
		}],
		title: {
			text: '<h1>Temperature (&deg;C)</h1>',
			useHTML: true
		},
		xAxis: {
			categories: axisCategories,
			labels: {
				formatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b', new Date(this.value)) + '</span>';
				}
			}
		},
		yAxis: {
			labels: {
				format: '{value}\xB0C'
			},
			title: false
		}
	});
}

function generateWeeklyQPFChart(axisCategories, seriesData) {
	new Highcharts.Chart({
		chart: {
			renderTo: 'qpfChartContainer',
			spacingTop: 20
		},
		series: [{
			data: seriesData,
			dataLabels: {
				enabled: true,
				format: '{y}mm',
				inside: true,
				verticalAlign: 'bottom'
			},
			name: 'Rain Amount',
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + 'mm</span>';
				}
			},
			type: 'column'
		}],
		title: {
			text: '<h1>QPF (mm)</h1>',
			useHTML: true
		},
		xAxis: {
			categories: axisCategories,
			labels: {
				formatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.value)) + '</span>';
				}
			},
			plotLines: [{
				color: 'rgba(0, 0, 255, 0.1)',
				width: 40,
				value: 7
			}]
		},
		yAxis: {
			labels: {
				format: '{value}mm'
			},
			title: false
		}
	});
}

function generateMonthlyQPFChart(axisCategories, seriesData) {
	new Highcharts.Chart({
		chart: {
			renderTo: 'qpfChartContainer',
			spacingTop: 20
		},
		series: [{
			data: seriesData,
			dataLabels: {
				enabled: true,
				format: '{y}mm',
				inside: true,
				verticalAlign: 'bottom'
			},
			name: 'Rain Amount',
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + 'mm</span>';
				}
			},
			type: 'column'
		}],
		title: {
			text: '<h1>QPF (mm)</h1>',
			useHTML: true
		},
		xAxis: {
			categories: axisCategories,
			labels: {
				formatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.value)) + '</span>';
				}
			}
		},
		yAxis: {
			labels: {
				format: '{value}mm'
			},
			title: false
		}
	});
}

function generateYearlyQPFChart(axisCategories, seriesData) {
	new Highcharts.Chart({
		chart: {
			renderTo: 'qpfChartContainer',
			spacingTop: 20
		},
		series: [{
			data: seriesData,
			dataLabels: {
				enabled: true,
				format: '{y}mm',
				inside: true,
				verticalAlign: 'bottom'
			},
			name: 'Rain Amount',
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b', new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + 'mm</span>';
				}
			},
			type: 'column'
		}],
		title: {
			text: '<h1>QPF (mm)</h1>',
			useHTML: true
		},
		xAxis: {
			categories: axisCategories,
			labels: {
				formatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b', new Date(this.value)) + '</span>';
				}
			}
		},
		yAxis: {
			labels: {
				format: '{value}mm'
			},
			title: false
		}
	});
}

function generateWeeklyProgramChart(programIndex, axisCategories, seriesData) {
	new Highcharts.Chart({
		chart: {
			renderTo: 'programChartContainer-' + programIndex,
			spacingTop: 20
		},
		series: [{
			data: seriesData,
			dataLabels: {
				enabled: true,
				format: '{y}%',
				inside: true,
				verticalAlign: 'bottom'
			},
			name: 'Program ' + programIndex,
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + '%</span>';
				}
			},
			type: 'column'
		}],
		title: {
			text: '<h1>Program ' + programIndex + ': Water Need (%)</h1>',
			useHTML: true
		},
		xAxis: {
			categories: axisCategories,
			labels: {
				formatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.value)) + '</span>';
				}
			},
			plotLines: [{
				color: 'rgba(0, 0, 255, 0.1)',
				width: 40,
				value: 7
			}]
		},
		yAxis: {
			labels: {
				format: '{value}%'
			},
			title: false
		}
	});
}

function generateMonthlyProgramChart(programIndex, axisCategories, seriesData) {
	new Highcharts.Chart({
		chart: {
			renderTo: 'programChartContainer-' + programIndex,
			spacingTop: 20
		},
		series: [{
			data: seriesData,
			dataLabels: {
				enabled: true,
				format: '{y}%',
				inside: true,
				verticalAlign: 'bottom'
			},
			name: 'Program ' + programIndex,
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + '%</span>';
				}
			},
			type: 'column'
		}],
		title: {
			text: '<h1>Program ' + programIndex + ': Water Need (%)</h1>',
			useHTML: true
		},
		xAxis: {
			categories: axisCategories,
			labels: {
				formatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b %e', new Date(this.value)) + '</span>';
				}
			}
		},
		yAxis: {
			labels: {
				format: '{value}%'
			},
			title: false
		}
	});
}

function generateYearlyProgramChart(programIndex, axisCategories, seriesData) {
	new Highcharts.Chart({
		chart: {
			renderTo: 'programChartContainer-' + programIndex,
			spacingTop: 20
		},
		series: [{
			data: seriesData,
			dataLabels: {
				enabled: true,
				format: '{y}%',
				inside: true,
				verticalAlign: 'bottom'
			},
			name: 'Program ' + programIndex,
			tooltip: {
				headerFormat: '',
				pointFormatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b', new Date(this.category))
						+ '</span>: <span style="font-size: 14px;">' + this.y + '%</span>';
				}
			},
			type: 'column'
		}],
		title: {
			text: '<h1>Program ' + programIndex + ': Water Need (%)</h1>',
			useHTML: true
		},
		xAxis: {
			categories: axisCategories,
			labels: {
				formatter: function () {
					return '<span style="font-size: 12px;">' + Highcharts.dateFormat('%b', new Date(this.value)) + '</span>';
				}
			}
		},
		yAxis: {
			labels: {
				format: '{value}%'
			},
			title: false
		}
	});
}