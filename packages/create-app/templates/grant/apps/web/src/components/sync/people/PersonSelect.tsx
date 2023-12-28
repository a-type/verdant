import { Participant, hooks } from '@/store.js';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItemRoot as SelectItem,
	SelectItemIndicator,
	SelectItemText,
	SelectLabel,
	SelectProps,
	SelectTrigger,
	SelectValue,
} from '@a-type/ui/components/select';
import { useCallback } from 'react';
import { PersonAvatar } from './PersonAvatar.jsx';

export interface PersonSelectProps
	extends Omit<SelectProps, 'value' | 'onChange'> {
	filter?: (person: Participant) => boolean;
	includeSelf?: boolean;
	allowNone?: boolean;
	value: string | null;
	onChange: (value: string | null, person: Participant | null) => void;
	label?: string;
}

function everyone() {
	return true;
}

export function PersonSelect({
	filter = everyone,
	includeSelf = false,
	value,
	allowNone,
	onChange,
	label,
	...rest
}: PersonSelectProps) {
	const people = hooks.useFindPeers(filter, { includeSelf });
	// oops, don't know which one is self specifically lol
	const self = hooks.useSelf();

	const onChangeInternal = useCallback(
		(value: string) => {
			const person = people.find((person) => person.id === value);
			onChange(value === 'null' ? null : value, person || null);
		},
		[people, onChange],
	);

	return (
		<Select
			value={value === null ? 'null' : value}
			onValueChange={onChangeInternal}
			{...rest}
		>
			<SelectTrigger
				className="border-none p-0 rounded-full [&[data-state=open]]:scale-[1.05]"
				contentEditable={false}
			>
				<SelectValue contentEditable={false}>
					{value === null ? (
						<PersonAvatar popIn={false} person={null} className="opacity-50" />
					) : (
						<PersonAvatar
							popIn={false}
							person={people.find((person) => person.id === value) || null}
						/>
					)}
				</SelectValue>
			</SelectTrigger>

			<SelectContent>
				<SelectGroup>
					{label && <SelectLabel>{label}</SelectLabel>}
					{allowNone && (
						<SelectItem
							className="flex flex-row gap-2 items-center"
							value="null"
						>
							<PersonAvatar popIn={false} person={null} />{' '}
							<SelectItemText>None</SelectItemText>
							<SelectItemIndicator />
						</SelectItem>
					)}
					{people.map((person) => (
						<PersonSelectItem
							key={person.id}
							person={person}
							isSelf={person.id === self.id}
						/>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

function PersonSelectItem({
	person,
	isSelf,
}: {
	person: Particpant;
	isSelf: boolean;
}) {
	return (
		<SelectItem value={person.id} className="flex flex-row gap-2 items-center">
			<PersonAvatar popIn={false} person={person} />
			<SelectItemText>{isSelf ? 'Me' : person.profile.name}</SelectItemText>
			<SelectItemIndicator />
		</SelectItem>
	);
}
