# DateRangePicker Component

A reusable date range picker component for React Native that allows users to select a start date and end date with an intuitive calendar interface.

## Features

- Select start and end dates with a calendar view
- Visual indication of selected dates and date range
- Month navigation (previous/next)
- Support for same-day selection (start date = end date)
- Defaults to current date when no initial dates provided
- Customizable max and min dates
- Clean, modern UI design
- Fully typed with TypeScript

## Usage

```tsx
import { DateRangePicker } from '@/components/DateRangePicker';

function MyComponent() {
  const [showPicker, setShowPicker] = useState(false);
  const today = new Date();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const handleApply = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <>
      <TouchableOpacity onPress={() => setShowPicker(true)}>
        <Text>{formatDateRangeDisplay()}</Text>
      </TouchableOpacity>

      <DateRangePicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onApply={handleApply}
        initialStartDate={startDate}
        initialEndDate={endDate}
        maxDate={new Date()}
      />
    </>
  );
}
```

## Props

| Prop               | Type                                       | Required | Default      | Description                                  |
| ------------------ | ------------------------------------------ | -------- | ------------ | -------------------------------------------- |
| `visible`          | `boolean`                                  | Yes      | -            | Controls the visibility of the modal         |
| `onClose`          | `() => void`                               | Yes      | -            | Callback when the modal is closed            |
| `onApply`          | `(startDate: Date, endDate: Date) => void` | Yes      | -            | Callback when dates are selected and applied |
| `initialStartDate` | `Date`                                     | No       | `new Date()` | Initial start date to display                |
| `initialEndDate`   | `Date`                                     | No       | `new Date()` | Initial end date to display                  |
| `maxDate`          | `Date`                                     | No       | `new Date()` | Maximum selectable date                      |
| `minDate`          | `Date`                                     | No       | `undefined`  | Minimum selectable date                      |

## Behavior

1. When the picker opens, it defaults to the current date if no initial dates are provided
2. Users can select a start date first
3. After selecting the start date, the picker automatically switches to end date selection
4. If the user selects an end date that's before the start date, the dates are automatically swapped
5. Users can tap on the date input boxes to switch between selecting start and end dates
6. The selected range is highlighted in the calendar
7. The "Apply" button is enabled when both dates are selected
8. If only a start date is selected when Apply is pressed, both dates will be set to the same date

## Styling

The component uses a pink/magenta color scheme by default:

- Selected dates: `#EC4899` (pink-500)
- Date range background: `#FDF2F8` (pink-50)
- Active input border: `#EC4899` (pink-500)

## Example in Sale History

The DateRangePicker is used in the sale-history.tsx page. The selected date range is displayed on a button:

```tsx
const today = new Date();
const [customStartDate, setCustomStartDate] = useState(today);
const [customEndDate, setCustomEndDate] = useState(today);
const [showDateRangePicker, setShowDateRangePicker] = useState(false);

const handleDateRangeApply = (start: Date, end: Date) => {
  setCustomStartDate(start);
  setCustomEndDate(end);
};

const formatDateRangeDisplay = () => {
  const isSameDay =
    customStartDate.getDate() === customEndDate.getDate() &&
    customStartDate.getMonth() === customEndDate.getMonth() &&
    customStartDate.getFullYear() === customEndDate.getFullYear();

  if (isSameDay) {
    return customStartDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return `${customStartDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} - ${customEndDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
};

// Button displays the selected date range
<TouchableOpacity
  style={styles.dateRangePickerButton}
  onPress={() => setShowDateRangePicker(true)}
>
  <Calendar size={20} color="#059669" />
  <Text>{formatDateRangeDisplay()}</Text>
</TouchableOpacity>

// Date range picker modal
<DateRangePicker
  visible={showDateRangePicker}
  onClose={() => setShowDateRangePicker(false)}
  onApply={handleDateRangeApply}
  initialStartDate={customStartDate}
  initialEndDate={customEndDate}
  maxDate={new Date()}
/>
```
