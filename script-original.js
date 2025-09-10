// =============================================================================
// GLOBAL VARIABLES AND CONFIGURATION
// =============================================================================

let currentMode = "fullCapacity"; // 'fullCapacity' or 'package'

// Baseline salary configuration
const BASELINE_ANNUAL_SALARY = 85000;
const BASELINE_HOURS = 40;

// Default package configurations
const defaultPackages = {
  starter: {
    name: "Starter",
    services: [{ type: "parent", hours: 4 }],
    discount: 0,
    inputId: "starterSales",
    maxId: "starterMax",
  },
  support: {
    name: "Support",
    services: [
      { type: "parent", hours: 4 },
      { type: "direct", hours: 8 },
      { type: "respite", hours: 4 },
    ],
    discount: 0.15,
    inputId: "supportSales",
    maxId: "supportMax",
  },
  parentSupport: {
    name: "Parent Support",
    services: [
      { type: "parent", hours: 8 },
      { type: "direct", hours: 4 },
      { type: "respite", hours: 12 },
    ],
    discount: 0.15,
    inputId: "parentSupportSales",
    maxId: "parentSupportMax",
  },
  intensive: {
    name: "Intensive",
    services: [
      { type: "parent", hours: 20 },
      { type: "direct", hours: 20 },
      { type: "respite", hours: 4 },
    ],
    discount: 0.2,
    inputId: "intensiveSales",
    maxId: "intensiveMax",
  },
  comprehensive: {
    name: "Comprehensive",
    services: [
      { type: "parent", hours: 4 },
      { type: "direct", hours: 40 },
      { type: "respite", hours: 4 },
    ],
    discount: 0.25,
    inputId: "comprehensiveSales",
    maxId: "comprehensiveMax",
  },
};

// Working copy of packages that can be modified
let packages = JSON.parse(JSON.stringify(defaultPackages));

// Service type definitions
const serviceTypes = {
  direct: "1:1 Direct BCBA",
  parent: "Parent Training",
  respite: "Respite Care",
  group: "Group Therapy",
};

// Service rates (per hour)
let serviceRates = {
  direct: 140,
  parent: 100,
  respite: 40,
  group: 60,
};

// Service mix percentages
let servicePercentages = {
  direct: 70,
  parent: 20,
  respite: 10,
  group: 0,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function generateMetricId(label, prefix = "metric") {
  return `${prefix}-${label.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

function formatCurrency(value) {
  const num = Math.round(parseFloat(value) || 0);
  return `$${num.toLocaleString()}`;
}

function parseCurrency(value) {
  if (typeof value === "string") {
    return parseFloat(value.replace(/[$,]/g, "")) || 0;
  }
  return parseFloat(value) || 0;
}

function safeNumber(value, defaultValue = 0) {
  const num = Number(value);
  return (isNaN(num) || num === null || num === undefined) ? defaultValue : num;
}

function safeToFixed(value, decimals = 1) {
  const num = safeNumber(value, 0);
  return num.toFixed(decimals);
}

function getPackageColorClass(packageKey) {
  const colorMap = {
    starter: 'package-starter',
    support: 'package-support', 
    parentSupport: 'package-parentsupport',
    intensive: 'package-intensive',
    comprehensive: 'package-comprehensive'
  };
  return colorMap[packageKey] || '';
}

// =============================================================================
// MODE SWITCHING FUNCTIONS
// =============================================================================

function switchMode(mode) {
  currentMode = mode;

  const $fullCapacityBtn = $("#fullCapacityBtn");
  const $packageModeBtn = $("#packageModeBtn");

  if (mode === "fullCapacity") {
    $fullCapacityBtn.css({backgroundColor: "#3b82f6",color: "white"});
    $packageModeBtn.css({backgroundColor: "transparent",color: "#374151"});
    $("#packageSalesSection, #package-tab").hide();
    $("#capacity-tab, .employee-section, .regan-salary").show();
  } else {
    $packageModeBtn.css({backgroundColor: "#3b82f6",color: "white"});
    $fullCapacityBtn.css({backgroundColor: "transparent",color: "#374151"});
    $("#packageSalesSection, #package-tab").show();
    $("#capacity-tab, .employee-section, .regan-salary").hide();
  }

  updateDashboard();
}

// =============================================================================
// PACKAGE CONFIGURATION FUNCTIONS
// =============================================================================

function openPackageConfig() {
  const $modal = $("#configModal");
  generatePackageConfigForm();
  $modal.slideToggle();
}

function closePackageConfig() {
  $("#configModal").slideToggle('hide');
}

function generatePackageConfigForm() {
  const $container = $("#packageConfigContainer");
  $container.empty();

  // Add service rates and percentages section
  const $ratesSection = $(`
    <div class="package-config rates-section">
      <h4>Global Service Configuration</h4>
      <div class="rates-header">
        <div>Service Type</div>
        <div>Hourly Rate</div>
        <div>Mix %</div>
      </div>
      <div class="rates-grid-combined">
        ${Object.entries(serviceTypes)
          .map(([type, label]) => `
          <div class="service-config-row">
            <div class="service-label">${label}</div>
            <div class="rate-input">
              <span style="margin-right: 5px;">$</span>
              <input type="number" id="globalRate_${type}" value="${serviceRates[type]}" min="10" max="500" step="5" />
              <span style="margin-left: 5px;">/hour</span>
            </div>
            <div class="percentage-input">
              <input type="number" id="${type}Percent" value="${servicePercentages[type]}" min="0" max="100" step="1" />
              <span style="margin-left: 5px;">%</span>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `);
  
  $ratesSection.find('input[id^="globalRate_"]').on('change', updateRateDisplays);
  $ratesSection.find('input[id$="Percent"]').on('change', updateEffectiveRate);
  $container.append($ratesSection);

  // Add package configurations
  Object.entries(packages).forEach(([key, pkg]) => {
    const hoursCapacity = pkg.services.reduce((sum, service) => sum + service.hours, 0);
    let totalCostBeforeDiscount = 0;
    pkg.services.forEach((service) => {
      const rate = serviceRates[service.type] || 0;
      totalCostBeforeDiscount += service.hours * rate;
    });
    const averageRate = hoursCapacity > 0 ? totalCostBeforeDiscount / hoursCapacity : 0;
    const packageCost = calculatePackageRevenue(pkg, {});
    const colorClass = getPackageColorClass(key);

    const $packageDiv = $(`
      <div class="package-config package ${colorClass}">
        <h4>Package: ${key} <span style="color: #6b7280; font-weight: normal; font-size: 0.9em;">(${hoursCapacity} hrs • $${Math.round(averageRate)}/hr avg • $${Math.round(packageCost).toLocaleString()}/month)</span></h4>
        <div class="config-row">
          <div class="input-group">
            <label>Package Name</label>
            <input type="text" id="name_${key}" value="${pkg.name}" />
          </div>
          <div class="input-group">
            <label>Discount (%)</label>
            <input type="number" id="discount_${key}" value="${pkg.discount * 100}" min="0" max="100" step="1" />
          </div>
        </div>
        <div class="service-config">
          <div id="services_${key}"></div>
          <button type="button" class="btn-add-service" data-package="${key}">+ Add Service</button>
        </div>
      </div>
    `);
    
    $container.append($packageDiv);
    populateServices(key);
  });
  
  $container.find('.btn-add-service').on('click', function() {
    const packageKey = $(this).data('package');
    addService(packageKey);
  });
}

function populateServices(packageKey) {
  const $servicesContainer = $(`#services_${packageKey}`);
  $servicesContainer.empty();

  packages[packageKey].services.forEach((service, index) => {
    const $serviceDiv = $(`
      <div class="service-row">
        <select id="type_${packageKey}_${index}">
          ${Object.entries(serviceTypes)
            .map(([value, label]) => `<option value="${value}" ${service.type === value ? "selected" : ""}>${label}</option>`)
            .join("")}
        </select>
        <input type="number" id="hours_${packageKey}_${index}" value="${service.hours}" min="1" max="40" placeholder="Hours" />
        <div class="rate-display" id="rateDisplay_${packageKey}_${index}">
          $${serviceRates[service.type] || 0}/hr
        </div>
        <button type="button" class="btn-remove-service" data-package="${packageKey}" data-index="${index}">×</button>
      </div>
    `);
    
    $serviceDiv.find('select').on('change', function() {
      updateRateDisplay(packageKey, index);
    });
    
    $serviceDiv.find('.btn-remove-service').on('click', function() {
      const pkg = $(this).data('package');
      const idx = $(this).data('index');
      removeService(pkg, idx);
    });
    
    $servicesContainer.append($serviceDiv);
  });
}

function updateRateDisplay(packageKey, serviceIndex) {
  const $typeSelect = $(`#type_${packageKey}_${serviceIndex}`);
  const $rateDisplay = $(`#rateDisplay_${packageKey}_${serviceIndex}`);
  const selectedType = $typeSelect.val();
  const $globalRateInput = $(`#globalRate_${selectedType}`);
  const rate = $globalRateInput.length ? $globalRateInput.val() : serviceRates[selectedType];
  $rateDisplay.text(`$${rate}/hr`);
}

function updateRateDisplays() {
  Object.keys(serviceRates).forEach((type) => {
    const $rateInput = $(`#globalRate_${type}`);
    if ($rateInput.length) {
      serviceRates[type] = parseFloat($rateInput.val()) || serviceRates[type];
    }
  });

  Object.entries(packages).forEach(([key, pkg]) => {
    pkg.services.forEach((service, index) => {
      updateRateDisplay(key, index);
    });
  });

  updateEffectiveRate();
}

function updateEffectiveRate() {
  const $display = $("#effectiveRateDisplay");
  if ($display.length) {
    $display.text(`$${calculateCurrentEffectiveRate()}`);
  }
}

function calculateCurrentEffectiveRate() {
  const directPercent = parseFloat(getServicePercentage("direct")) || 0;
  const parentPercent = parseFloat(getServicePercentage("parent")) || 0;
  const respitePercent = parseFloat(getServicePercentage("respite")) || 0;
  const groupPercent = parseFloat(getServicePercentage("group")) || 0;
  const totalPercent = directPercent + parentPercent + respitePercent + groupPercent;

  if (totalPercent === 0) {
    return Math.round(serviceRates.direct);
  }

  const weightedRate = (serviceRates.direct * directPercent + serviceRates.parent * parentPercent + serviceRates.respite * respitePercent + serviceRates.group * groupPercent) / totalPercent;
  return Math.round(weightedRate);
}

function getServicePercentage(type) {
  const $input = $(`#${type}Percent`);
  if ($input.length) {
    return $input.val();
  }
  return servicePercentages[type] || 0;
}

function addService(packageKey) {
  packages[packageKey].services.push({
    type: "direct",
    hours: 4,
  });
  populateServices(packageKey);
}

function removeService(packageKey, serviceIndex) {
  if (packages[packageKey].services.length > 1) {
    packages[packageKey].services.splice(serviceIndex, 1);
    populateServices(packageKey);
  }
}

function savePackageConfig() {
  // Save service rates
  Object.keys(serviceRates).forEach((type) => {
    const $rateInput = $(`#globalRate_${type}`);
    if ($rateInput.length) {
      serviceRates[type] = parseFloat($rateInput.val()) || serviceRates[type];
    }
  });

  // Save service percentages
  Object.keys(serviceTypes).forEach((type) => {
    const $percentInput = $(`#${type}Percent`);
    if ($percentInput.length) {
      servicePercentages[type] = parseFloat($percentInput.val()) || 0;
    }
  });

  // Save package configurations
  Object.keys(packages).forEach((key) => {
    packages[key].name = $(`#name_${key}`).val();
    packages[key].discount = parseFloat($(`#discount_${key}`).val()) / 100;

    const services = [];
    const $servicesContainer = $(`#services_${key}`);
    const $serviceRows = $servicesContainer.find(".service-row");

    $serviceRows.each(function(index) {
      const type = $(`#type_${key}_${index}`).val();
      const hours = parseFloat($(`#hours_${key}_${index}`).val());
      services.push({ type: type, hours: hours });
    });

    packages[key].services = services;
  });

  updatePackageSalesInputs();
  closePackageConfig();
  updateDashboard();
}

function resetToDefaults() {
  if (confirm("Are you sure you want to reset all package configurations to defaults? This will lose all your custom settings.")) {
    packages = JSON.parse(JSON.stringify(defaultPackages));
    serviceRates = { direct: 140, parent: 100, respite: 40, group: 60 };
    servicePercentages = { direct: 70, parent: 20, respite: 10, group: 0 };
    generatePackageConfigForm();
    updatePackageSalesInputs();
    updateDashboard();
  }
}

function updatePackageSalesInputs() {
  const $container = $("#packageSalesInputs");
  $container.empty();

  Object.entries(packages).forEach(([key, pkg]) => {
    const hoursCapacity = pkg.services.reduce((sum, service) => sum + service.hours, 0);
    let totalCostBeforeDiscount = 0;
    pkg.services.forEach((service) => {
      const rate = serviceRates[service.type] || 0;
      totalCostBeforeDiscount += service.hours * rate;
    });
    const averageRate = hoursCapacity > 0 ? totalCostBeforeDiscount / hoursCapacity : 0;
    const packageCost = calculatePackageRevenue(pkg, {});
    const colorClass = getPackageColorClass(key);
    
    const $inputDiv = $(`
      <div class="input-group package-sales-item package-sales-${key}">
        <div class="left" style="display:flex;flex-direction:column;width:175px;">
          <label>${pkg.name} - $${Math.round(packageCost).toLocaleString()}/month</label>
          <div class="package-details" style="font-size: 11px; color: #6b7280; line-height: 1.3;">
            <div class="package-details-text">
              ${hoursCapacity} hrs  $${Math.round(averageRate)}/hr   ${pkg.discount > 0 ? ` (${pkg.discount * 100}% discount)` : ""}
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 3px;">
          <input type="text" id="${pkg.inputId}" value="0" style="width: 60px;" />
          <span style="color: #6b7280;">/ <span id="${pkg.maxId}">0</span> max</span>
        </div>
      </div>
    `);
    
    $container.append($inputDiv);
    $(`#${pkg.inputId}`).on('input change', updateDashboard);
  });
}

// =============================================================================
// INPUT HANDLING FUNCTIONS
// =============================================================================

function getInputValues() {
  try {
    const billableRate = parseFloat($('#billableRateSlider').val()) / 100 || 0.8;

    const employeeBillable = parseFloat($('#employeeBillableSlider').val()) / 100 || 0.85;

    const safeGetValue = (id, defaultValue = 0) => {
      const $element = $(`#${id}`);
      return $element.length ? parseFloat($element.val()) || defaultValue : defaultValue;
    };

    const billableHours = safeGetValue("reganBillableHours", 0);
    
    let nonBillableHours = 0;
    if (billableRate > 0) {
      const totalWorked = billableHours / billableRate;
      nonBillableHours = Math.max(0, totalWorked - billableHours);
    }

    const result = {
      hoursCapacity: safeGetValue("hoursCapacity", 40),
      lighthouseHours: safeGetValue("lighthouseHours", 0),
      reganBillableHours: billableHours,
      reganNonBillableHours: nonBillableHours,
      reganTotalHours: billableHours + nonBillableHours,
      billableRate: billableRate,
      currentAnnualIncome: parseCurrency($("#currentAnnualIncome").val() || "85000"),
      monthlyLightHouseIncome: parseCurrency($("#monthlyLightHouseIncome").val() || "7083"),
      directPercent: servicePercentages.direct || 70,
      parentPercent: servicePercentages.parent || 20,
      respitePercent: servicePercentages.respite || 10,
      groupPercent: servicePercentages.group || 0,
      employeeRate: safeGetValue("employeeRate", 35),
      employeeBillable: employeeBillable,
    };

    // Get package sales values
    Object.entries(packages).forEach(([key, pkg]) => {
      const $input = $(`#${pkg.inputId}`);
      if ($input.length) {
        result[pkg.inputId.replace("Sales", "Sales")] = parseInt($input.val()) || 0;
      }
    });

    return result;
  } catch (error) {
    console.error("Error getting input values:", error);
    return {
      hoursCapacity: 40, lighthouseHours: 0, reganBillableHours: 0,
      reganNonBillableHours: 0, reganTotalHours: 0, billableRate: 0.8,
      currentAnnualIncome: 85000, monthlyLightHouseIncome: 7083,
      directPercent: 70, parentPercent: 20, respitePercent: 10, groupPercent: 0,
      employeeRate: 35, employeeBillable: 0.85,
    };
  }
}

function validateHours() {
  try {
    const hoursCapacity = parseFloat($("#hoursCapacity").val()) || 0;
    const lighthouseHours = parseFloat($("#lighthouseHours").val()) || 0;
    const reganBillableHours = parseFloat($("#reganBillableHours").val()) || 0;
    
    const billableRate = parseFloat($('#billableRateSlider').val()) / 100 || 0.8;
    
    let reganNonBillableHours = 0;
    if (billableRate > 0) {
      const totalWorked = reganBillableHours / billableRate;
      reganNonBillableHours = Math.max(0, totalWorked - reganBillableHours);
    }
    
    const reganTotalHours = reganBillableHours + reganNonBillableHours;
    const allocatedHours = lighthouseHours + reganTotalHours;

    // Validate lighthouse hours
    const $lighthouseEl = $("#lighthouseHours");
    if (lighthouseHours > 40 && $lighthouseEl.length) {
      $lighthouseEl.val("40").removeClass().addClass("warning-input");
      updatemonthlyLightHouseIncomeFromLighthouseHours();
      return;
    } else if ($lighthouseEl.length) {
      $lighthouseEl.removeClass("warning-input");
    }

    // Validate total capacity
    const $billableEl = $("#reganBillableHours");
    if (allocatedHours > hoursCapacity && $billableEl.length) {
      const maxTotalReganHours = Math.max(0, hoursCapacity - lighthouseHours);
      const maxBillableHours = maxTotalReganHours * billableRate;
      
      $billableEl.val(maxBillableHours.toFixed(1));
      
      const $nonBillableEl = $("#reganNonBillableHours");
      if ($nonBillableEl.length) {
        const newNonBillable = Math.max(0, maxTotalReganHours - maxBillableHours);
        $nonBillableEl.val(Math.round(newNonBillable));
      }

      $billableEl.removeClass().addClass("warning-input");
    } else if ($billableEl.length) {
      const remaining = hoursCapacity - allocatedHours;
      $billableEl.removeClass().addClass(remaining === 0 ? "success-input" : "");
    }

    // Update max values
    if ($lighthouseEl.length) {
      $lighthouseEl.attr('max', Math.min(40, hoursCapacity));
    }
    
    const maxReganTotal = Math.max(0, hoursCapacity - lighthouseHours);
    const maxReganBillable = maxReganTotal * billableRate;
    
    if ($billableEl.length) {
      $billableEl.attr('max', maxReganBillable);
    }
  } catch (error) {
    console.error("Error validating hours:", error);
  }
}

function updatemonthlyLightHouseIncomeFromLighthouseHours() {
  try {
    const lighthouseHours = parseFloat($("#lighthouseHours").val() || "0") || 0;
    const proportionalAnnualIncome = BASELINE_ANNUAL_SALARY * (lighthouseHours / BASELINE_HOURS);
    const monthlyIncome = Math.round(proportionalAnnualIncome / 12);

    const $annualIncomeEl = $("#currentAnnualIncome");
    const $monthlyIncomeEl = $("#monthlyLightHouseIncome");
    
    if ($annualIncomeEl.length) $annualIncomeEl.val(formatCurrency(proportionalAnnualIncome));
    if ($monthlyIncomeEl.length) $monthlyIncomeEl.val(formatCurrency(monthlyIncome));

    updateDashboard();
  } catch (error) {
    console.error("Error updating target income from lighthouse hours:", error);
  }
}

function updateIncomeFields() {
  try {
    const $annualIncomeEl = $("#currentAnnualIncome");
    const annualIncome = $annualIncomeEl.length ? parseCurrency($annualIncomeEl.val()) : 85000;
    const monthlyIncome = Math.round(annualIncome / 12);
    
    const $monthlyIncomeEl = $("#monthlyLightHouseIncome");
    if ($monthlyIncomeEl.length) {
      $monthlyIncomeEl.val(formatCurrency(monthlyIncome));
    }

    updateDashboard();
  } catch (error) {
    console.error("Error updating income fields:", error);
  }
}

// =============================================================================
// CALCULATION FUNCTIONS
// =============================================================================

function calculatereganHourlyRate(inputs) {
  try {
    const totalPercent = inputs.directPercent + inputs.parentPercent + inputs.respitePercent + inputs.groupPercent;

    if (totalPercent === 0) {
      return serviceRates.direct;
    }

    const weightedRate = (serviceRates.direct * inputs.directPercent + serviceRates.parent * inputs.parentPercent + serviceRates.respite * inputs.respitePercent + serviceRates.group * inputs.groupPercent) / totalPercent;
    return weightedRate;
  } catch (error) {
    console.error("Error calculating Merriment hourly rate:", error);
    return serviceRates.direct;
  }
}

function calculatereganEffectiveRate(inputs) {
  try {
    const hourlyRate = calculatereganHourlyRate(inputs);
    return hourlyRate * inputs.billableRate;
  } catch (error) {
    console.error("Error calculating Merriment effective rate:", error);
    return calculatereganHourlyRate(inputs);
  }
}

function calculatePackageRevenue(pkg, inputs) {
  try {
    let total = 0;
    pkg.services.forEach((service) => {
      const rate = serviceRates[service.type] || 0;
      total += service.hours * rate;
    });
    return total * (1 - pkg.discount);
  } catch (error) {
    console.error("Error calculating package revenue:", error);
    return 0;
  }
}

function calculateAveragePackagePrice() {
  try {
    const inputs = getInputValues();
    const packagePrices = Object.values(packages).map(pkg => calculatePackageRevenue(pkg, inputs));
    const totalPrice = packagePrices.reduce((sum, price) => sum + price, 0);
    return packagePrices.length > 0 ? totalPrice / packagePrices.length : 0;
  } catch (error) {
    console.error("Error calculating average package price:", error);
    return 0;
  }
}

function calculatePackagesNeededForGoal() {
  try {
    const averagePrice = calculateAveragePackagePrice();
    const monthlyGoal = 85000 / 12;
    return averagePrice > 0 ? monthlyGoal / averagePrice : 0;
  } catch (error) {
    console.error("Error calculating packages needed for goal:", error);
    return 0;
  }
}

function calculatePackagesNeededForCapacity() {
  try {
    const inputs = getInputValues();
    const reganMonthlyHours = inputs.reganBillableHours * 4;
    
    const $employeeCountRadio = $('input[name="employeeCount"]:checked');
    const employeeCount = $employeeCountRadio.length ? parseFloat($employeeCountRadio.val()) : 0;
    const employeeMonthlyHours = employeeCount * 40 * inputs.employeeBillable * 4;
    
    const totalMonthlyHours = reganMonthlyHours + employeeMonthlyHours;
    
    const packageHours = Object.values(packages).map(pkg => 
      pkg.services.reduce((sum, service) => sum + service.hours, 0)
    );
    const averagePackageHours = packageHours.length > 0 ? 
      packageHours.reduce((sum, hours) => sum + hours, 0) / packageHours.length : 0;
    
    return averagePackageHours > 0 ? totalMonthlyHours / averagePackageHours : 0;
  } catch (error) {
    console.error("Error calculating packages needed for capacity:", error);
    return 0;
  }
}

// =============================================================================
// UPDATE/DISPLAY FUNCTIONS
// =============================================================================

function updateMetrics() {
  try {
    const inputs = getInputValues();

    const lighthousePercentage = inputs.lighthouseHours / 40;
    const proportionalSalary = lighthousePercentage * inputs.currentAnnualIncome;
    const lighthouseHourlyRate = inputs.lighthouseHours > 0 ? proportionalSalary / (52 * inputs.lighthouseHours) : 0;
    const lighthouseRevenue = proportionalSalary / 12;
    const reganHourlyRate = calculatereganHourlyRate(inputs) || 0;
    const reganEffectiveRate = calculatereganEffectiveRate(inputs) || 0;
    
    const reganBillableHours = safeNumber(inputs.reganBillableHours, 0);
    const reganNonBillableHours = safeNumber(inputs.reganNonBillableHours, 0);
    const reganTotalHours = safeNumber(inputs.reganTotalHours, 0);
    
    const reganAnnualRevenue = reganBillableHours * reganEffectiveRate * 52;
    const reganRevenue = reganAnnualRevenue / 12;

    const $reganMetricsEl = $("#reganMetrics");
    if ($reganMetricsEl.length) {
      const reganMetricsData = {
        "Total Hours/Week": Math.round(safeNumber(reganTotalHours, 0)),
        "Billable Hours/Week": reganBillableHours % 1 === 0 ? Math.round(reganBillableHours) : safeToFixed(reganBillableHours, 1),
        "Hourly Rate": `$${Math.round(safeNumber(reganHourlyRate, 0))}`,
        "Effective Hourly Rate": `$${Math.round(safeNumber(reganEffectiveRate, 0))}`,
        "Annual Revenue": `$${reganAnnualRevenue >= 1000 ? Math.round(reganAnnualRevenue / 1000) + 'K' : Math.round(reganAnnualRevenue)}`,
      };

      const metricsHtml = Object.entries(reganMetricsData)
        .map(([label, value]) => `
          <div class="metric-card" id="${generateMetricId(label, 'regan')}">
            <div class="metric-value">${value}</div>
            <div class="metric-label">${label}</div>
          </div>
        `).join("");
        
      $reganMetricsEl.html(metricsHtml);
    }

    updateEmployeeMetrics(inputs, reganEffectiveRate);
  } catch (error) {
    console.error("Error updating metrics:", error);
    const $reganMetricsEl = $("#reganMetrics");
    if ($reganMetricsEl.length) {
      $reganMetricsEl.html(`<div class="metric-card"><div class="metric-value">Error</div><div class="metric-label">Unable to calculate</div></div>`);
    }
  }
}

function updateEmployeeMetrics(inputs, reganEffectiveRate) {
  try {
    if (!inputs || typeof reganEffectiveRate !== 'number' || isNaN(reganEffectiveRate)) {
      console.warn("Invalid inputs for employee metrics");
      return;
    }

    const $employeeCountRadio = $('input[name="employeeCount"]:checked');
    const employeeCount = $employeeCountRadio.length ? parseFloat($employeeCountRadio.val()) : 0;

    let $employeeMetricsEl = $("#employeeMetrics");
    const $merrimentSection = $("#merrimentSection");
    
    if (employeeCount > 0) {
        $('.employee-billable, .employee-hourly-rate').show();
      if (!$employeeMetricsEl.length) {
        if ($merrimentSection.length) {
          const $employeeSection = $(`
            <div class="section" id="employeeSection">
              <h3>Employee Stats</h3>
              <div class="metric-grid" id="employeeMetrics"></div>
            </div>
          `);
          $merrimentSection.after($employeeSection);
          $employeeMetricsEl = $("#employeeMetrics");
        } else {
          const $container = $("body").find(".container").first().length ? $("body").find(".container").first() : $("body");
          const $employeeSection = $(`
            <div class="section" id="employeeSection">
              <h3>Employee Stats</h3>
              <div class="metric-grid" id="employeeMetrics"></div>
            </div>
          `);
          $container.append($employeeSection);
          $employeeMetricsEl = $("#employeeMetrics");
        }
      }

      if ($employeeMetricsEl.length) {
        const employeeWeeklyHours = 40;
        const employeeBillableRate = safeNumber(inputs.employeeBillable, 0.85);
        const employeeBillableHours = employeeWeeklyHours * employeeBillableRate;
        const employeeHourlyRate = safeNumber(inputs.employeeRate, 35);
        const employeeEffectiveRate = safeNumber(reganEffectiveRate, 100);
        
        const employeeAnnualRevenue = employeeBillableHours * employeeEffectiveRate * 52 * employeeCount;
        const employeeAnnualSalary = employeeHourlyRate * employeeWeeklyHours * 52 * employeeCount;
        const merrimentProfitFromEmployee = employeeAnnualRevenue - employeeAnnualSalary;

        const employeeMetricsData = {
          "Employee Total Hours/Week": `${(employeeWeeklyHours * employeeCount) % 1 === 0 ? Math.round(employeeWeeklyHours * employeeCount) : safeToFixed(employeeWeeklyHours * employeeCount, 1)}`,
          "Employee Billable Hours/Week": `${(employeeBillableHours * employeeCount) % 1 === 0 ? Math.round(employeeBillableHours * employeeCount) : safeToFixed(employeeBillableHours * employeeCount, 1)}`,
          "Employee Hourly Rate": `$${Math.round(employeeHourlyRate)}`,
          "Employee Effective Hourly Rate": `$${Math.round(employeeEffectiveRate)}`,
          "Employee Annual Revenue": `$${employeeAnnualRevenue >= 1000 ? Math.round(employeeAnnualRevenue / 1000) + 'K' : Math.round(employeeAnnualRevenue)}`,
          "Employee Salary": `$${employeeAnnualSalary >= 1000 ? Math.round(employeeAnnualSalary / 1000) + 'K' : Math.round(employeeAnnualSalary)}`,
          "Merriment Profit from Employee": `$${merrimentProfitFromEmployee >= 1000 ? Math.round(merrimentProfitFromEmployee / 1000) + 'K' : Math.round(merrimentProfitFromEmployee)}`,
        };

        const employeeHtml = Object.entries(employeeMetricsData)
          .map(([label, value]) => `
            <div class="metric-card" id="${generateMetricId(label, 'employee')}">
              <div class="metric-value">${value}</div>
              <div class="metric-label">${label}</div>
            </div>
          `).join("");
          
        $employeeMetricsEl.html(employeeHtml);
        
        const $employeeSection = $("#employeeSection");
        if ($employeeSection.length) {
          $employeeSection.show();
        }
      }
    } else {
      const $employeeSection = $("#employeeSection");
      if ($employeeSection.length) {
        $employeeSection.hide();
        $('.employee-billable, .employee-hourly-rate').hide();
      }
    }
  } catch (error) {
    console.error("Error updating employee metrics:", error);
    const $employeeMetricsEl = $("#employeeMetrics");
    if ($employeeMetricsEl.length) {
      $employeeMetricsEl.html(`
        <div class="metric-card">
          <div class="metric-value">Error</div>
          <div class="metric-label">Unable to calculate employee metrics</div>
        </div>
      `);
    }
  }
}

function updateGoalProgress() {
  try {
    const inputs = getInputValues();
    let reganAnnualRevenue = 0;
    
    const $employeeCountRadio = $('input[name="employeeCount"]:checked');
    const employeeCount = $employeeCountRadio.length ? parseFloat($employeeCountRadio.val()) : 0;
    let employeeProfit = 0;
    
    if (employeeCount > 0) {
      const reganEffectiveRate = calculatereganEffectiveRate(inputs);
      const employeeWeeklyHours = 40;
      const employeeBillableHours = employeeWeeklyHours * inputs.employeeBillable;
      const employeeAnnualRevenue = employeeBillableHours * reganEffectiveRate * 52 * employeeCount;
      const employeeAnnualSalary = inputs.employeeRate * employeeWeeklyHours * 52 * employeeCount;
      employeeProfit = employeeAnnualRevenue - employeeAnnualSalary;
    }

    if (currentMode === "fullCapacity") {
      const reganEffectiveRate = calculatereganEffectiveRate(inputs);
      const reganBillableHours = inputs.reganBillableHours;
      reganAnnualRevenue = reganBillableHours * reganEffectiveRate * 52 + employeeProfit;

      const weeklyTargetRevenue = 85000 / 52;
      const hoursNeededPerWeek = weeklyTargetRevenue / reganEffectiveRate;

      const $hoursNeededEl = $("#hoursNeeded");
      if ($hoursNeededEl.length) {
        $hoursNeededEl.text(`${hoursNeededPerWeek.toFixed(1)} hrs`);

        const currentHours = inputs.reganBillableHours;
        if (hoursNeededPerWeek <= currentHours) {
          $hoursNeededEl.css('color', '#059669');
        } else if (hoursNeededPerWeek <= inputs.hoursCapacity * 0.9) {
          $hoursNeededEl.css('color', '#d97706');
        } else {
          $hoursNeededEl.css('color', '#dc2626');
        }
      }
    } else {
      let totalMonthlyRevenue = 0;

      Object.entries(packages).forEach(([key, pkg]) => {
        const $salesInput = $(`#${pkg.inputId}`);
        const userSales = $salesInput.length ? parseInt($salesInput.val()) || 0 : 0;
        const packageRevenue = calculatePackageRevenue(pkg, inputs);
        totalMonthlyRevenue += packageRevenue * userSales;
      });

      reganAnnualRevenue = totalMonthlyRevenue * 12 + employeeProfit;

      const weeklyTargetRevenue = 85000 / 52;
      const monthlyTargetRevenue = weeklyTargetRevenue * 4;
      const $hoursNeededEl = $("#hoursNeeded");

      if ($hoursNeededEl.length) {
        if (totalMonthlyRevenue >= monthlyTargetRevenue) {
          $hoursNeededEl.text("Goal Met!").css('color', '#059669');
        } else {
          const shortfall = monthlyTargetRevenue - totalMonthlyRevenue;
          $hoursNeededEl.text(`${Math.round(shortfall).toLocaleString()} more`).css('color', '#d97706');
        }
      }
    }

    const progressPercentage = (reganAnnualRevenue / 85000) * 100;

    const $progressFillEl = $("#progressFill");
    if ($progressFillEl.length) {
      $progressFillEl.css('width', `${progressPercentage}%`);
    }

    const $progressCurrentEl = $("#progressCurrent");
    const $progressPercentageEl = $("#progressPercentage");

    if ($progressCurrentEl.length) {
      const formattedRevenue = reganAnnualRevenue >= 1000 ? `${Math.round(reganAnnualRevenue / 1000)}K` : Math.round(reganAnnualRevenue).toString();
      $progressCurrentEl.text(`$${formattedRevenue}`);
    }

    if ($progressPercentageEl.length) {
      $progressPercentageEl.text(`${Math.round(progressPercentage)}%`);
    }

    updateGoalStatusClass(progressPercentage);
    
  } catch (error) {
    console.error("Error updating goal progress:", error);
  }
}

function updateGoalStatusClass(progressPercentage) {
  try {
    const $body = $('body');
    
    const goalClasses = ['goal-not-started', 'goal-minimal', 'goal-developing', 'goal-advancing', 'goal-near-complete', 'goal-achieved'];
    $body.removeClass(goalClasses.join(' '));
    
    let goalStatusClass = '';
    
    if (progressPercentage === 0) {
      goalStatusClass = 'goal-not-started';
    } else if (progressPercentage <= 25) {
      goalStatusClass = 'goal-minimal';
    } else if (progressPercentage <= 50) {
      goalStatusClass = 'goal-developing';
    } else if (progressPercentage <= 75) {
      goalStatusClass = 'goal-advancing';
    } else if (progressPercentage < 100) {
      goalStatusClass = 'goal-near-complete';
    } else {
      goalStatusClass = 'goal-achieved';
    }
    
    $body.addClass(goalStatusClass);
    $body.attr('data-goal-progress', Math.round(progressPercentage));
    
  } catch (error) {
    console.error("Error updating goal status class:", error);
  }
}

function updatePackageMetrics() {
  try {
    const inputs = getInputValues();
    const $packageMetricsEl = $("#packageMetrics");

    if ($packageMetricsEl.length) {
      let hoursCapacityPerMonth = 0;
      let totalMonthlyRevenue = 0;

      Object.entries(packages).forEach(([key, pkg]) => {
        const $salesInput = $(`#${pkg.inputId}`);
        const userSales = $salesInput.length ? parseInt($salesInput.val()) || 0 : 0;

        const hoursRequired = pkg.services.reduce((sum, service) => sum + service.hours, 0);
        const packageRevenue = calculatePackageRevenue(pkg, inputs);

        hoursCapacityPerMonth += hoursRequired * userSales;
        totalMonthlyRevenue += packageRevenue * userSales;
      });

      const weeklyHours = hoursCapacityPerMonth / 4;
      const annualRevenue = totalMonthlyRevenue * 12;
      const effectiveHourlyRate = hoursCapacityPerMonth > 0 ? totalMonthlyRevenue / hoursCapacityPerMonth : 0;

      const packageMetricsData = {
        "Total Billable Hours": `${hoursCapacityPerMonth.toFixed(1)}/month`,
        "Effective Hourly Rate": `$${Math.round(effectiveHourlyRate)}`,
        "Monthly Revenue": `$${Math.round(totalMonthlyRevenue).toLocaleString()}`,
        "Annual Revenue": `$${Math.round(annualRevenue).toLocaleString()}`,
      };

      const packageHtml = Object.entries(packageMetricsData)
        .map(([label, value]) => `
          <div class="metric-card" id="${generateMetricId(label, 'package')}">
            <div class="metric-value">${value}</div>
            <div class="metric-label">${label}</div>
          </div>
        `).join("");
        
      $packageMetricsEl.html(packageHtml);
    }
  } catch (error) {
    console.error("Error updating package metrics:", error);
  }
}

function updatePackageAnalysis() {
  try {
    const inputs = getInputValues();
    const $packageDiv = $("#packageAnalysis");
    const $utilityDiv = $("#utilityAnalysis");
    const totalAvailableHours = inputs.reganBillableHours * 4;

    if ($packageDiv.length) {
      Object.entries(packages).forEach(([key, pkg]) => {
        const hoursRequired = pkg.services.reduce((sum, service) => sum + service.hours, 0);
        const maxPossible = Math.floor(totalAvailableHours / hoursRequired);
        const $maxElement = $(`#${pkg.maxId}`);
        if ($maxElement.length) {
          $maxElement.text(maxPossible);
        }

        const $inputElement = $(`#${pkg.inputId}`);
        if ($inputElement.length) {
          $inputElement.attr('max', maxPossible);
        }
      });

      let hoursCapacityUsed = 0;
      let totalRevenue = 0;

      const packageCards = Object.entries(packages)
        .map(([key, pkg]) => {
          const revenue = calculatePackageRevenue(pkg, {});
          const hoursRequired = pkg.services.reduce((sum, service) => sum + service.hours, 0);
          const maxPossible = Math.floor(totalAvailableHours / hoursRequired);

          const $salesInput = $(`#${pkg.inputId}`);
          const userSales = $salesInput.length ? parseInt($salesInput.val()) || 0 : 0;

          const actualRevenue = revenue * userSales;
          const actualHoursUsed = hoursRequired * userSales;
          hoursCapacityUsed += actualHoursUsed;
          totalRevenue += actualRevenue;

          const warningStyle = userSales > maxPossible ? "color: #dc2626; font-weight: bold;" : "";
          const colorClass = getPackageColorClass(key);

          const servicesBreakdown = pkg.services
            .map((service) => {
              let serviceName = serviceTypes[service.type] || "Unknown Service";
              let serviceRate = serviceRates[service.type] || 0;
              const serviceCost = service.hours * serviceRate;

              return `<div style="font-size: 10px; color: #4b5563; margin-bottom: 2px;">
              ${serviceName}: ${service.hours}hrs × $${serviceRate} = $${serviceCost.toLocaleString()}
            </div>`;
            }).join("");

          return `
            <div class="package-card ${colorClass}">
              <div class="package-title">${pkg.name}</div>
              <div class="package-revenue">$${Math.round(revenue).toLocaleString()}/month</div>
              
              <div>
                ${servicesBreakdown}
                <div style="font-size: 0.9rem; color: #1f2937; font-weight: 600; margin-top: 5px; padding-top: 5px; border-top: 1px solid #d1d5db;">
                  Total: ${hoursRequired} hours = $${Math.round(revenue).toLocaleString()}
                </div>
                ${pkg.discount > 0 ? `<div style="color: #dc2626; font-size: 0.85rem; margin-top: 2px;">After ${pkg.discount * 100}% discount</div>` : ""}
              </div>
            </div>
          `;
        }).join("");

      const remainingHours = totalAvailableHours - hoursCapacityUsed;
      const utilizationPercent = totalAvailableHours > 0 ? (hoursCapacityUsed / totalAvailableHours) * 100 : 0;
      const summaryColor = hoursCapacityUsed > totalAvailableHours ? "#dc2626" : "#059669";

      const summaryCard = `
        <div class="package-card" style="border: 2px solid ${summaryColor};display:none;">
          <div class="package-title">Monthly Hours</div>
          <div style="color: #6b7280; margin-bottom: 5px;">Hours used: ${hoursCapacityUsed.toFixed(1)} / ${totalAvailableHours.toFixed(1)}</div>
          <div style="color: #6b7280; margin-bottom: 5px;">Utilization: ${utilizationPercent.toFixed(1)}%</div>
          <div style="color: ${remainingHours >= 0 ? "#059669" : "#dc2626"};">Monthly Hours Remaining: ${remainingHours.toFixed(1)}</div>
        </div>

        <div class="metric-card" id="${generateMetricId('Hours Used', 'utility')}">
          <div class="metric-value">${hoursCapacityUsed.toFixed(1)} / ${totalAvailableHours.toFixed(1)}</div>
          <div class="metric-label">Hours Used</div>
        </div>

        <div class="metric-card" id="${generateMetricId('Utilization', 'utility')}">
          <div class="metric-value">${utilizationPercent.toFixed(1)}%</div>
          <div class="metric-label">Utilization</div>
        </div>

        <div class="metric-card" id="${generateMetricId('Remaining Hours', 'utility')}">
          <div class="metric-value"><div style="color: ${remainingHours >= 0 ? "#059669" : "#dc2626"};"> ${remainingHours.toFixed(1)}</div></div>
          <div class="metric-label">Remaining Hours</div>
        </div>
      `;

      $packageDiv.html(packageCards);
      $utilityDiv.html(summaryCard);
    }
  } catch (error) {
    console.error("Error updating package analysis:", error);
  }
}

function updatePackageGoalMetrics() {
  try {
    const averagePrice = calculateAveragePackagePrice();
    const packagesForGoal = calculatePackagesNeededForGoal();
    const packagesForCapacity = calculatePackagesNeededForCapacity();

    // Update capacity tab elements
    const $avgPriceEl = $("#averagePackagePrice");
    if ($avgPriceEl.length) {
      $avgPriceEl.text(`$${Math.round(averagePrice).toLocaleString()}`);
    }

    const $packagesGoalEl = $("#packagesNeededGoal");
    if ($packagesGoalEl.length) {
      $packagesGoalEl.text(`${packagesForGoal.toFixed(1)} clients`);
    }

    const $packagesCapacityEl = $("#packagesNeededCapacity");
    if ($packagesCapacityEl.length) {
      $packagesCapacityEl.text(`${packagesForCapacity.toFixed(1)}`);
    }

    // Update package tab elements
    const $avgPriceEl2 = $("#averagePackagePrice2");
    if ($avgPriceEl2.length) {
      $avgPriceEl2.text(`$${Math.round(averagePrice).toLocaleString()}`);
    }

    const $packagesGoalEl2 = $("#packagesNeededGoal2");
    if ($packagesGoalEl2.length) {
      $packagesGoalEl2.text(`${packagesForGoal.toFixed(1)} clients`);
    }

    const $hoursNeededEl2 = $("#hoursNeeded2");
    if ($hoursNeededEl2.length) {
      const hoursNeeded = 85000 / 52 / calculatereganEffectiveRate(getInputValues());
      $hoursNeededEl2.text(`${hoursNeeded.toFixed(1)} hrs`);
    }
  } catch (error) {
    console.error("Error updating package goal metrics:", error);
  }
}

function updateGrowthScenarios() {
  try {
    const inputs = getInputValues();
    const $tbody = $("#growthTableBody");

    if (!$tbody.length) return;

    const reganEffectiveRate = calculatereganEffectiveRate(inputs);
    
    const $employeeCountRadio = $('input[name="employeeCount"]:checked');
    const employeeCount = $employeeCountRadio.length ? parseFloat($employeeCountRadio.val()) : 0;

    const scenarios = [
      { 
        name: "Today", 
        lighthouseHours: 40,
        reganBillableHours: 0, 
        rate: inputs.billableRate,
        overrides: {
          lighthousePercentage: null, merrimentPercentage: null, totalWeeklyHours: null,
          lighthouseAnnualRevenue: null, reganAnnualRevenue: null, combinedAnnualRevenue: null
        }
      },
      { 
        name: "Current State", 
        lighthouseHours: inputs.lighthouseHours,
        reganBillableHours: inputs.reganBillableHours, 
        rate: inputs.billableRate,
        overrides: {
          lighthousePercentage: null, merrimentPercentage: null, totalWeeklyHours: null,
          lighthouseAnnualRevenue: null, reganAnnualRevenue: null, combinedAnnualRevenue: null
        }
      },
      { 
        name: "Lighthouse/Merriment 50/50%", 
        lighthouseHours: 20,
        reganBillableHours: 20, 
        rate: inputs.billableRate,
        overrides: {
          lighthousePercentage: 50, merrimentPercentage: 50, totalWeeklyHours: null,
          lighthouseAnnualRevenue: null, reganAnnualRevenue: null, combinedAnnualRevenue: null
        }
      },
      { 
        name: "Lighthouse/Merriment 25/75%", 
        lighthouseHours: 10,
        reganBillableHours: 30, 
        rate: inputs.billableRate,
        overrides: {
          lighthousePercentage: 25, merrimentPercentage: 75, totalWeeklyHours: null,
          lighthouseAnnualRevenue: null, reganAnnualRevenue: null, combinedAnnualRevenue: null
        }
      },
      { 
        name: "Lighthouse 0%/ Merriment 100%", 
        lighthouseHours: 0,
        reganBillableHours: Math.min(inputs.hoursCapacity, inputs.reganBillableHours + inputs.lighthouseHours), 
        rate: inputs.billableRate,
        overrides: {
          lighthousePercentage: 0, merrimentPercentage: 100, totalWeeklyHours: null,
          lighthouseAnnualRevenue: null, reganAnnualRevenue: null, combinedAnnualRevenue: null
        }
      }
    ];

    const isOverridden = (value) => value !== null && value !== undefined;
    const getOverrideStyle = (value) => isOverridden(value) ? "" : "";
    const createScenarioClass = (name) => {
      return name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    };

    const rowsHtml = scenarios.map((scenario) => {
      const { overrides } = scenario;
      
      const lighthouseMerrimentTotal = scenario.lighthouseHours + scenario.reganBillableHours;
      
      const lighthousePercentage = isOverridden(overrides.lighthousePercentage)
        ? overrides.lighthousePercentage
        : lighthouseMerrimentTotal > 0 ? (scenario.lighthouseHours / lighthouseMerrimentTotal) * 100 : 0;
      
      const merrimentPercentage = isOverridden(overrides.merrimentPercentage)
        ? overrides.merrimentPercentage
        : lighthouseMerrimentTotal > 0 ? (scenario.reganBillableHours / lighthouseMerrimentTotal) * 100 : 0;
      
      const totalWeeklyHours = isOverridden(overrides.totalWeeklyHours)
        ? overrides.totalWeeklyHours
        : scenario.lighthouseHours + scenario.reganBillableHours;
      
      const lighthouseAnnualRevenue = isOverridden(overrides.lighthouseAnnualRevenue)
        ? overrides.lighthouseAnnualRevenue
        : (scenario.lighthouseHours / BASELINE_HOURS) * BASELINE_ANNUAL_SALARY;
      
      let employeeProfit = 0;
      if (employeeCount > 0) {
        const employeeWeeklyHours = 40;
        const employeeBillableHours = employeeWeeklyHours * inputs.employeeBillable;
        const employeeAnnualRevenue = employeeBillableHours * reganEffectiveRate * 52 * employeeCount;
        const employeeAnnualSalary = inputs.employeeRate * employeeWeeklyHours * 52 * employeeCount;
        employeeProfit = employeeAnnualRevenue - employeeAnnualSalary;
      }
      
      const reganAnnualRevenue = isOverridden(overrides.reganAnnualRevenue)
        ? overrides.reganAnnualRevenue
        : (scenario.reganBillableHours * reganEffectiveRate * 52) + employeeProfit;
      
      const combinedAnnualRevenue = isOverridden(overrides.combinedAnnualRevenue)
        ? overrides.combinedAnnualRevenue
        : lighthouseAnnualRevenue + reganAnnualRevenue;
      
      const billableHours = scenario.reganBillableHours;
      
      const isHighlighted = combinedAnnualRevenue >= 85000;
      const scenarioClass = createScenarioClass(scenario.name);
      const rowClasses = [
        isHighlighted ? "highlight" : "",
        `scenario-${scenarioClass}`
      ].filter(Boolean).join(' ');
      
      return `
        <tr class="${rowClasses}">
          <td>${scenario.name}</td>
          <td style="${getOverrideStyle(overrides.lighthousePercentage)}">${lighthousePercentage.toFixed(1)}%</td>
          <td style="${getOverrideStyle(overrides.merrimentPercentage)}">${merrimentPercentage.toFixed(1)}%</td>
          <td>${scenario.lighthouseHours.toFixed(1)}</td>
          <td>${scenario.reganBillableHours.toFixed(1)}</td>
          <td>${billableHours.toFixed(1)}</td>
          <td style="${getOverrideStyle(overrides.totalWeeklyHours)}">${totalWeeklyHours.toFixed(1)}</td>
          <td class="currency" style="${getOverrideStyle(overrides.lighthouseAnnualRevenue)}">${Math.round(lighthouseAnnualRevenue).toLocaleString()}</td>
          <td class="currency" style="${getOverrideStyle(overrides.reganAnnualRevenue)}">${Math.round(reganAnnualRevenue).toLocaleString()}</td>
          <td class="currency" style="${getOverrideStyle(overrides.combinedAnnualRevenue)}">${Math.round(combinedAnnualRevenue).toLocaleString()}</td>
        </tr>
      `;
    }).join("");

    $tbody.html(rowsHtml);

  } catch (error) {
    console.error("Error updating growth scenarios:", error);
  }
}

function updateEmployeeAnalysis() {
  try {
    const inputs = getInputValues();
    const $tbody = $("#employeeTableBody");

    if ($tbody.length) {
      const reganEffectiveRate = calculatereganEffectiveRate(inputs);
      const scenarios = [0, 1, 2, 3, 5];

      const rowsHtml = scenarios
        .map((employees) => {
          const reganBillableHours = inputs.reganBillableHours * inputs.billableRate;
          const employeeHours = employees * 40 * inputs.employeeBillable;
          const totalCapacity = reganBillableHours + employeeHours;

          const reganRevenue = reganBillableHours * reganEffectiveRate * 4;
          const employeeRevenue = employeeHours * reganEffectiveRate * 4;
          const totalRevenue = reganRevenue + employeeRevenue;

          const employeeCosts = employees * inputs.employeeRate * 40 * 4;
          const netProfit = totalRevenue - employeeCosts;
          const roi = employees > 0 ? ((netProfit - reganRevenue) / employeeCosts) * 100 : 0;

          const isOptimal = netProfit >= inputs.monthlyLightHouseIncome * 2;

          return `
            <tr class="${isOptimal ? "highlight" : ""}">
              <td>${employees}</td>
              <td>${totalCapacity.toFixed(1)}</td>
              <td class="currency">$${totalRevenue.toLocaleString()}</td>
              <td class="currency">$${employeeCosts.toLocaleString()}</td>
              <td class="currency">$${netProfit.toLocaleString()}</td>
              <td style="color: ${roi > 50 ? "#059669" : roi > 0 ? "#2563eb" : "#dc2626"};">${roi.toFixed(1)}%</td>
            </tr>
          `;
        }).join("");
        
      $tbody.html(rowsHtml);
    }
  } catch (error) {
    console.error("Error updating employee analysis:", error);
  }
}

function updateSalesScenarios() {
    try {
      const inputs = getInputValues();
      const $tbody = $("#salesTableBody");
  
      if (!$tbody.length) return;
  
      // Standard scenarios: 1-5 of each package (mixed)
      const scenarios = [1, 2, 3, 4, 5];
      
      const standardRows = scenarios.map((quantity) => {
        let totalMonthlyHours = 0;
        let totalMonthlyRevenue = 0;
  
        Object.entries(packages).forEach(([key, pkg]) => {
          const hoursRequired = pkg.services.reduce((sum, service) => sum + service.hours, 0);
          const packageRevenue = calculatePackageRevenue(pkg, inputs);
          
          totalMonthlyHours += hoursRequired * quantity;
          totalMonthlyRevenue += packageRevenue * quantity;
        });
  
        const weeklyTotalHours = totalMonthlyHours / 4;
        const weeklyBillableHours = weeklyTotalHours * inputs.billableRate;
        const weeklyNonBillableHours = weeklyTotalHours - weeklyBillableHours;
        const effectiveHourlyRate = totalMonthlyHours > 0 ? totalMonthlyRevenue / totalMonthlyHours : 0;
        const annualRevenue = totalMonthlyRevenue * 12;
  
        const rowClass = annualRevenue >= 85000 ? "highlight" : "";
  
        return `
          <tr class="${rowClass}">
            <td>${quantity} of each package</td>
            <td>${weeklyTotalHours.toFixed(1)}</td>
            <td>${weeklyBillableHours.toFixed(1)}</td>
            <td>${weeklyNonBillableHours.toFixed(1)}</td>
            <td>${weeklyBillableHours.toFixed(1)}</td>
            <td class="currency">$${Math.round(effectiveHourlyRate)}</td>
            <td class="currency">${annualRevenue >= 85000 ? '<strong>' : ''}$${Math.round(annualRevenue).toLocaleString()}${annualRevenue >= 85000 ? '</strong>' : ''}</td>
          </tr>
        `;
      });
  
      // Individual package scenarios: 5 of each package type separately
      const individualRows = Object.entries(packages).map(([key, pkg]) => {
        const quantity = 5;
        const hoursRequired = pkg.services.reduce((sum, service) => sum + service.hours, 0);
        const packageRevenue = calculatePackageRevenue(pkg, inputs);
        
        const totalMonthlyHours = hoursRequired * quantity;
        const totalMonthlyRevenue = packageRevenue * quantity;
  
        const weeklyTotalHours = totalMonthlyHours / 4;
        const weeklyBillableHours = weeklyTotalHours * inputs.billableRate;
        const weeklyNonBillableHours = weeklyTotalHours - weeklyBillableHours;
        const effectiveHourlyRate = totalMonthlyHours > 0 ? totalMonthlyRevenue / totalMonthlyHours : 0;
        const annualRevenue = totalMonthlyRevenue * 12;
  
        const rowClass = annualRevenue >= 85000 ? "highlight" : "";
  
        return `
          <tr class="${rowClass}">
            <td>5 ${pkg.name}</td>
            <td>${weeklyTotalHours.toFixed(1)}</td>
            <td>${weeklyBillableHours.toFixed(1)}</td>
            <td>${weeklyNonBillableHours.toFixed(1)}</td>
            <td>${weeklyBillableHours.toFixed(1)}</td>
            <td class="currency">$${Math.round(effectiveHourlyRate)}</td>
            <td class="currency">${annualRevenue >= 85000 ? '<strong>' : ''}$${Math.round(annualRevenue).toLocaleString()}${annualRevenue >= 85000 ? '</strong>' : ''}</td>
          </tr>
        `;
      });
  
      // Combine standard rows + individual rows (NO combined row)
      const allRows = [...standardRows, ...individualRows].join("");
      $tbody.html(allRows);
  
    } catch (error) {
      console.error("Error updating sales scenarios:", error);
    }
  }

function updateDashboard() {
  try {
    validateHours();
    updateGoalProgress();
    updateMetrics();
    updatePackageMetrics();
    updatePackageAnalysis();
    updatePackageGoalMetrics();
    updateGrowthScenarios();
    updateEmployeeAnalysis();
    updateSalesScenarios();
  } catch (error) {
    console.error("Error updating dashboard:", error);
  }
}

// =============================================================================
// EVENT LISTENERS AND INITIALIZATION
// =============================================================================

$(document).ready(function () {
  try {
    updateEmployeeMetrics();
    updatePackageSalesInputs();
    switchMode("fullCapacity");
    
    // Helper functions for hours management
    const updateNonBillableHours = () => {
      try {
        const $billableEl = $("#reganBillableHours");
        const $nonBillableEl = $("#reganNonBillableHours");
        
        if (!$billableEl.length || !$nonBillableEl.length) return;
        
        const billableHours = parseFloat($billableEl.val()) || 0;
        const billableRate = parseFloat($('#billableRateSlider').val()) / 100 || 0.8;
        
        if (billableRate > 0) {
          const totalWorked = billableHours / billableRate;
          const nonBillableHours = Math.max(0, totalWorked - billableHours);
          $nonBillableEl.val(Math.round(nonBillableHours));
        }
      } catch (e) {
        console.error("Error updating non-billable hours:", e);
      }
    };

    const updateTotalHours = () => {
      try {
        const $billableEl = $("#reganBillableHours");
        const $nonBillableEl = $("#reganNonBillableHours");
        const $totalEl = $("#reganTotalHours");
        
        if (!$billableEl.length || !$nonBillableEl.length || !$totalEl.length) return;
        
        const billableHours = parseFloat($billableEl.val()) || 0;
        const nonBillableHours = parseFloat($nonBillableEl.val()) || 0;
        const totalHours = billableHours + nonBillableHours;
        $totalEl.val(Math.round(totalHours));
      } catch (e) {
        console.error("Error updating total hours:", e);
      }
    };

    const updateFromTotal = () => {
      try {
        const $totalEl = $("#reganTotalHours");
        const $billableEl = $("#reganBillableHours");
        const $nonBillableEl = $("#reganNonBillableHours");
        
        if (!$totalEl.length || !$billableEl.length || !$nonBillableEl.length) return;
        
        const totalHours = parseFloat($totalEl.val()) || 0;
        const billableRate = parseFloat($('#billableRateSlider').val()) / 100 || 0.8;
        
        const billableHours = totalHours * billableRate;
        const nonBillableHours = totalHours - billableHours;
        
        $billableEl.val(billableHours.toFixed(1));
        $nonBillableEl.val(Math.round(Math.max(0, nonBillableHours)));
      } catch (e) {
        console.error("Error updating from total hours:", e);
      }
    };
    
    // Event listeners
    ["hoursCapacity"].forEach((id) => {
      $(`#${id}`).on("input change", updateDashboard);
    });

    $("#reganBillableHours").on("input change", function() {
      updateNonBillableHours();
      updateTotalHours();
      updateDashboard();
    });

    $("#reganTotalHours").on("input change", function() {
      updateFromTotal();
      updateDashboard();
    });
    
    $("#lighthouseHours").on("input change", updatemonthlyLightHouseIncomeFromLighthouseHours);
    $('#employeeBillableSlider').on("input change", function() {
      $('#employeeBillableValue').text($(this).val() + '%');
      updateDashboard();
    });
    
    $('#billableRateSlider').on("input change", function() {
      $('#billableRateValue').text($(this).val() + '%');
      updateNonBillableHours();
      updateTotalHours();
      updateDashboard();
    });

    $('input[name="employeeCount"]').on("change", updateDashboard);
    
    $('input, select').each(function() {
      if (!this.id.includes("Sales")) {
        $(this).on("change input", updateDashboard);
      }
    });
    
    // Initialize values
    try {
      updatemonthlyLightHouseIncomeFromLighthouseHours();
      updateNonBillableHours();
      updateTotalHours();
    } catch (e) {
      console.error("Error during initialization:", e);
    }
  } catch (error) {
    console.error("Error setting up event listeners:", error);
  }
});

// =============================================================================
// GLOBAL FUNCTION EXPORTS
// =============================================================================

window.switchMode = switchMode;
window.openPackageConfig = openPackageConfig;
window.closePackageConfig = closePackageConfig;
window.savePackageConfig = savePackageConfig;
window.resetToDefaults = resetToDefaults;
window.addService = addService;
window.removeService = removeService;
window.updateRateDisplays = updateRateDisplays;
window.updateEffectiveRate = updateEffectiveRate;